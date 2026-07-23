---
title: 具身智能中的强化学习架构：从算法、训练系统到工程框架
summary: 系统梳理具身智能项目中的强化学习算法架构、训练架构、策略网络、数据流、分层决策与部署方式，并比较 skrl、rl_games、RSL-RL 等常用训练框架的优缺点和适用场景。
tags:
  - 强化学习
  - 具身智能
  - 机器人
date: 2026-07-23
comments: true
---

# 具身智能中的强化学习架构：从算法、训练系统到工程框架

## 背景

在强化学习项目中，“架构”至少可能指五件不同的事情：

1. **算法架构**：策略、价值函数、环境模型之间如何组织，例如 Actor-Critic、Model-Based RL。
2. **训练架构**：环境采样、经验存储、梯度更新和参数同步如何运行，例如同步向量化、异步 Actor-Learner。
3. **软件框架**：用什么代码库实现训练，例如 `skrl`、`rl_games`、RSL-RL、Stable-Baselines3。
4. **策略网络架构**：观测如何编码、融合、记忆并输出动作，例如 MLP、CNN、RNN、Transformer。
5. **具身系统架构**：感知、规划、技能和底层控制如何分层，以及策略怎样部署到真实机器人。

这些概念经常被混在一起。例如，`PPO` 是算法，`rl_games` 是训练框架，GPU 上的数千个并行 Isaac Lab 环境属于训练架构，而“视觉编码器 + LSTM + Actor-Critic”属于策略网络架构。

一套完整的具身强化学习系统可以抽象为：

```text
机器人或仿真环境
       │ observation / reward / done
       ▼
并行环境与数据采集器
       │ rollout / transition
       ▼
经验缓冲区或轨迹存储
       │ batch
       ▼
算法更新器（PPO / SAC / ...）
       │ parameters
       ▼
策略网络（Encoder + Memory + Actor/Critic）
       │ action
       └──────────────────────────────► 环境
```

本文从这五个层次分别说明各类架构的组成、优缺点和典型使用情况，重点面向 Isaac Lab、机器人运动控制、视觉导航和操作任务。

## 结论

- `skrl`、`rl_games` 和 RSL-RL 是**训练框架**，PPO、SAC 和 Dreamer 是**算法或算法族**，二者不能放在同一维度比较。
- Isaac Lab 中大规模、端到端 GPU 的连续控制通常优先考虑 `rl_games` 或 RSL-RL；需要修改算法、存储器和训练流程时，`skrl` 更灵活。
- PPO 适合大量并行仿真，SAC/TD3 适合强调样本复用的连续控制，离线 RL 适合真实数据已经存在但在线试错昂贵的场景。
- 训练速度不只取决于算法，还取决于环境是否在 GPU、是否发生 CPU/GPU 数据复制、rollout 长度、批大小和策略网络复杂度。
- 长时程具身任务通常不应只靠一个端到端策略解决。更常见的工程方案是“高层任务规划 + 技能策略 + 底层控制 + 安全约束”。
- 框架选型应先确定仿真器、动作空间、并行规模、是否需要循环网络、是否需要离线数据以及最终是否部署到真机，再比较算法数量或 API 风格。

## 过程

### 1. 先建立统一术语

强化学习交互通常写成状态或观测 $o_t$、动作 $a_t$、奖励 $r_t$ 和下一观测 $o_{t+1}$。具身智能中，$o_t$ 可能包含关节状态、IMU、力传感器、RGB-D 图像、点云、地图和语言指令。

本文使用以下术语：

| 术语 | 含义 | 例子 |
| --- | --- | --- |
| 算法 | 如何定义目标函数并更新策略 | PPO、SAC、DQN、IQL |
| Agent | 执行动作并被训练的策略实体 | Actor-Critic agent |
| Environment | 产生观测、奖励和终止信号的系统 | Isaac Lab task、Gymnasium env |
| Runner/Trainer | 驱动采样、更新、评估和保存的训练循环 | OnPolicyRunner、SequentialTrainer |
| Rollout | 策略与环境交互得到的一段轨迹 | $T \times N$ 个 transition |
| Replay Buffer | 可跨更新重复采样的经验池 | SAC、DQN 使用 |
| Vectorized Environment | 一次并行推进多个环境 | Isaac Lab 的数千个机器人实例 |
| Actor-Learner | 采样进程与训练进程分离的系统 | IMPALA、Ape-X 风格系统 |
| Policy Network | 从观测计算动作分布或动作的网络 | Gaussian Actor、Categorical Actor |

### 2. 算法架构

#### 2.1 Value-Based：以价值函数为中心

Value-Based 方法学习 $Q(s,a)$ 或 $V(s)$，然后选择价值最高的动作。典型算法包括 DQN、Double DQN、Dueling DQN 和 Rainbow。

```text
observation ──► Q network ──► Q(a1), Q(a2), ..., Q(an)
                                  │
                                  └── argmax ──► action
```

**优点**：

- 离散动作空间中概念和实现相对直接。
- Replay Buffer 可以提高历史数据利用率。
- Q 值可以辅助分析不同动作的相对偏好。

**缺点**：

- 无法自然处理关节力矩等高维连续动作。
- 大动作集合会使输出层和动作搜索变得困难。
- 视觉输入、稀疏奖励和部分可观测性会显著增加训练难度。

**使用情况**：离散导航动作、技能选择、任务调度和小规模多智能体离散决策。它不是连续机器人控制的主流方案。

#### 2.2 Policy-Based：直接优化策略

Policy-Based 方法直接学习 $\pi_\theta(a|s)$。连续动作通常由高斯分布的均值和标准差表示，离散动作则使用分类分布。

**优点**：

- 能自然表示连续动作和随机策略。
- 可以学习多个可行解对应的多峰或随机行为。
- 优化目标直接指向期望回报。

**缺点**：

- 纯 REINFORCE 的梯度方差很大。
- 缺少价值基线时样本效率和稳定性较差。
- 工程中通常会进一步演化成 Actor-Critic。

#### 2.3 Actor-Critic：当前最常见的基础结构

Actor 根据观测输出动作或动作分布，Critic 估计状态价值或动作价值，并为 Actor 提供低方差的学习信号。

```text
                    ┌──► Actor  ──► action distribution
observation ──► encoder
                    └──► Critic ──► value / Q-value
```

常见的两个分支是：

| 分支 | 代表算法 | 数据特点 | 适合场景 |
| --- | --- | --- | --- |
| On-policy | A2C、PPO | 新策略主要使用刚采集的轨迹 | 大规模并行仿真 |
| Off-policy | DDPG、TD3、SAC | 使用 Replay Buffer，多次复用旧数据 | 真实机器人、样本昂贵的连续控制 |

**PPO** 通过 clipped surrogate objective 限制策略单次更新幅度。它稳定、易并行，是 Isaac 生态中最常见的算法，但历史数据不能长期重复利用。

**SAC** 同时最大化回报和策略熵，探索能力强、样本利用率较高。它适合连续控制，但 Replay Buffer、多个 Q 网络和逐步采样会增加显存与系统复杂度。

**TD3** 使用双 Q 网络、延迟 Actor 更新和目标策略平滑抑制价值高估。它部署时策略确定、计算简单，但探索能力通常不如 SAC。

#### 2.4 Model-Based RL：显式或隐式学习环境模型

模型式强化学习学习动力学模型 $p(s_{t+1}|s_t,a_t)$，再用模型进行规划或生成想象轨迹。

```text
observation ─► encoder ─► latent state ─► dynamics model ─► imagined future
                                │                              │
                                └──────── actor/critic ◄──────┘
```

典型路线包括 PETS、MBPO、Dreamer 和 TD-MPC。Dreamer 类方法在潜在空间学习世界模型，并在想象轨迹上训练 Actor-Critic；TD-MPC 类方法把潜在动力学、价值学习和在线规划结合起来。

**优点**：交互样本利用率高，能够预测后果，并可与规划结合。

**缺点**：接触、摩擦、软体、遮挡和动态障碍难以准确建模；模型误差会在多步预测中累积，策略还可能利用模型缺陷。

**使用情况**：视觉控制、真实机器人小样本学习、带在线规划的操作任务。对于已经能在 GPU 仿真中廉价产生海量数据的运动控制，模型式方法不一定比 PPO 更划算。

#### 2.5 Offline RL：只从固定数据集训练

Offline RL 不在训练期间向环境在线探索，而是使用机器人日志、遥操作轨迹或历史策略数据。常见算法包括 CQL、IQL、BCQ 和 TD3+BC。

```text
fixed dataset ─► replay/data loader ─► offline RL learner ─► policy
     ▲                                                        │
     └──────── 不在训练环中执行新动作 ────────────────────────┘
```

**优点**：不需要危险或昂贵的在线试错；能利用已有真实数据；适合先模仿再优化。

**缺点**：数据覆盖范围决定策略上限；策略选择数据分布之外的动作时，价值估计容易失真；离线评估很难完全替代真实部署测试。

**使用情况**：机械臂示教数据、自动驾驶日志、真实机器人历史轨迹。实践中经常与 Behavior Cloning、少量在线微调组合。

#### 2.6 Hierarchical RL：把长任务拆成多个时间尺度

分层强化学习让高层策略产生子目标或技能编号，低层策略把子目标转换为连续控制动作。

```text
language/task goal
       │
       ▼
high-level policy ──► subgoal / skill id      每 10~100 步决策一次
       │
       ▼
low-level policy  ──► joint targets/torques   每个控制周期执行
```

**优点**：改善长时程信用分配，技能可复用，高层动作空间更容易规划。

**缺点**：技能边界、子目标表示和上下层训练方式难以设计；高层指令可能超出低层能力范围。

**使用情况**：移动操作、长程导航、开门后取物、人形全身任务，以及 VLM/LLM 负责高层规划、RL 负责低层技能的系统。

#### 2.7 Multi-Agent RL：多个实体共同学习

多智能体强化学习常采用 CTDE，即训练时集中、执行时分散。训练阶段 Critic 可以查看其他智能体信息，部署时每个 Actor 只使用自身可获得的观测。

代表算法包括 MAPPO、MADDPG、QMIX 和 VDN。

**主要难点**：其他智能体的策略不断变化，使单个智能体看到的环境非平稳；团队奖励还会产生信用分配问题。

**使用情况**：多机器人搬运、无人机集群、交通控制、足球机器人和社会交互仿真。

### 3. 训练架构

算法决定“怎样更新”，训练架构决定“数据从哪里来、在哪里算、如何同步”。同一个 PPO 可以运行在完全不同的训练架构上。

#### 3.1 单环境串行训练

```text
env.step ─► store ─► update ─► env.step ─► ...
```

实现最简单、调试方便，但硬件利用率低，样本相关性强。主要用于教学、环境正确性检查和小型基线，不适合高吞吐量具身训练。

#### 3.2 同步向量化训练

```text
N parallel envs ──► rollout buffer ──► learner update ──► broadcast policy
       ▲                                                        │
       └──────────────────── 同步等待 ──────────────────────────┘
```

所有环境使用同一份策略并行推进，收集固定长度 rollout 后统一更新。PPO 常采用这种架构。

**优点**：数据版本一致、实现和复现相对简单；适合 GPU 上成百上千个同构仿真环境。

**缺点**：最慢的环境可能拖住整个批次；更新期间环境通常暂停；非常复杂的视觉传感器可能成为瓶颈。

#### 3.3 端到端 GPU 仿真与训练

Isaac Gym/Isaac Lab 的关键优势不是简单的“多环境”，而是物理仿真张量、观测、奖励、策略推理和梯度更新都尽量保留在 GPU。

```text
GPU physics ─► GPU observation/reward ─► GPU policy ─► GPU action
     │                                             │
     └────────────── rollout tensors ◄─────────────┘
```

这种架构避免每一步把大量状态复制到 CPU，特别适合低维本体感觉和连续控制。`rl_games`、RSL-RL 和 `skrl` 都可用于相关场景。

瓶颈通常来自：

- 摄像头渲染和图像编码比刚体状态计算昂贵得多。
- 环境数量过多会挤占训练网络所需显存。
- rollout 过短导致频繁更新，过长则增加策略滞后和显存消耗。
- Python 回调、日志或逐环境逻辑可能破坏批量执行效率。

#### 3.4 异步 Actor-Learner

多个 Actor 独立采样，Learner 持续消费数据并更新参数。IMPALA、Ape-X 和部分大规模分布式系统采用这一思想。

```text
Actor 1 ─┐
Actor 2 ─┼─► trajectory queue / replay ─► Learner ─► parameter server
Actor N ─┘          ▲                                  │
                    └──────── policy weights ──────────┘
```

**优点**：采样与更新重叠；能跨进程和机器扩展；慢环境不会阻塞所有 Actor。

**缺点**：Actor 使用的参数可能落后于 Learner，形成 policy lag；系统需要队列、容错、流量控制和离策略修正；复现和调试困难。

当单机 GPU 已能运行数千个轻量环境时，异步分布式架构未必更快。它更适合环境计算昂贵、需要跨机器扩展或视觉推理较重的任务。

#### 3.5 Replay Buffer 驱动的离策略训练

```text
collector ─► replay buffer ─► sampler ─► learner
    ▲                                │         │
    └──────── current policy ◄───────┴─────────┘
```

SAC、TD3 和 DQN 采用这类数据流。采样与学习的比例通常用 UTD（update-to-data ratio）描述。

优势是经验可以重复利用，缺点是内存占用更大、数据新旧混合，并且大规模并行环境会快速产生数据，Learner 可能来不及消费。

#### 3.6 离线预训练与在线微调

具身系统常采用三阶段训练：

```text
专家/历史数据 ─► BC 或 Offline RL ─► 仿真在线 RL ─► 真机小步微调
```

这种方式比从随机策略直接上真机更现实。关键是处理数据格式统一、动作定义差异、观测归一化和训练阶段切换时的分布变化。

#### 3.7 多 GPU 与多机训练

常见并行维度有两种：

- **环境并行**：每个 GPU 运行不同的环境实例并产生不同轨迹。
- **数据并行学习**：每个 GPU 持有策略副本，对不同 mini-batch 求梯度，再通过 all-reduce 同步。

强化学习不像普通监督学习那样只扩大 batch 就能线性扩展。策略更新会改变后续数据分布，因此还要考虑 rollout 划分、优势归一化范围、随机种子、参数同步频率和策略滞后。

### 4. 常见训练框架

#### 4.1 框架总览

| 框架 | 主要定位 | 强项 | 主要限制 | 典型使用情况 |
| --- | --- | --- | --- | --- |
| `skrl` | 模块化机器人 RL | PyTorch/JAX、组件可替换、Isaac 集成 | 生态规模小于 SB3/RLlib | 自定义 Agent、比较算法、Isaac 研究 |
| `rl_games` | 高吞吐量 GPU RL | PPO/A2C、大批量并行、成熟 Isaac 实践 | 内部扩展和调试门槛较高 | Isaac Lab 连续控制、灵巧手、运动控制 |
| RSL-RL | 机器人运动控制 | 精简高效的 PPO、Legged Gym/Isaac 生态 | 算法面较窄 | 四足、人形、locomotion、Sim-to-Real |
| Stable-Baselines3 | 通用可靠基线 | 易用、文档和社区成熟 | 不是为数千 GPU 环境优先设计 | 小中规模控制、快速基线、教学 |
| CleanRL | 可读的单文件实现 | 透明、方便学习和改算法 | 工程组件和复用能力有限 | 论文复现、教学、算法实验 |
| TorchRL | PyTorch RL 基础设施 | TensorDict、collector、buffer、组合能力 | 抽象多，学习曲线较陡 | 自建研究系统、离线 RL、复杂数据流 |
| Ray RLlib | 分布式和多智能体 | 多机、多智能体、容错和扩展 | 重量级，配置与调试成本高 | 云端训练、大规模 MARL、工业平台 |
| Tianshou | 灵活的 PyTorch 研究框架 | Policy/Collector/Buffer 分层清晰 | Isaac 专用实践较少 | 通用算法研究、离线和多智能体实验 |
| Sample Factory | 高吞吐异步采样 | 视觉环境、异步并行、多 GPU | 系统复杂，机器人生态相对小 | 大规模视觉导航、游戏、多智能体 |

#### 4.2 skrl

`skrl` 将模型、memory、agent、trainer、environment wrapper 和 preprocessing 等组件分开。它适合需要进入算法内部做修改的研究项目。

**优势**：

- 组件边界清晰，容易替换 policy、value、memory、scheduler 和 preprocessor。
- 同时提供 PyTorch 和 JAX 路线。
- 能包装 Gymnasium、Isaac Lab 等环境。
- 不只覆盖 PPO，也便于尝试 SAC、TD3 等不同数据流。

**不足**：

- 社区规模、第三方教程和现成扩展少于 Stable-Baselines3。
- 追求单一 PPO 路线的极限吞吐量时，未必胜过更专用的实现。
- 灵活性意味着使用者需要理解更多训练组件。

**适合**：需要自定义损失、网络、经验存储、混合多种算法，或把研究想法嵌入 Isaac Lab 的项目。

#### 4.3 rl_games

`rl_games` 的核心取向是高性能向量化训练，尤其擅长连续控制 PPO。许多配置通过 YAML 或参数字典完成。

**优势**：

- 在大量 GPU 并行环境下具有成熟的吞吐表现。
- PPO/A2C 路线经过较多机器人任务验证。
- 支持常见连续动作分布、观测归一化、RNN 和自博弈相关能力。
- 与 NVIDIA Isaac 相关环境具有较多历史实践。

**不足**：

- 配置项与内部调用链较长，初次定位行为比较困难。
- 插入全新算法或特殊数据流通常不如 `skrl` 直观。
- 主要优势集中在 on-policy、大批量并行场景。

**适合**：算法基本确定为 PPO，目标是在 Isaac Lab 中稳定、高速训练大量连续控制环境。

#### 4.4 RSL-RL

RSL-RL 是机器人运动控制领域常见的轻量训练库，与 Legged Gym 和 Isaac Lab 的足式机器人任务关系紧密。

**优势**：代码相对紧凑，PPO 路线高效；在四足、人形和 locomotion 任务中有大量实践；便于与课程学习、域随机化和特权观测结合。

**不足**：它不是追求算法数量的通用平台；离线 RL、复杂多智能体和多种 off-policy 算法通常需要额外开发。

**适合**：足式机器人、人形运动、模仿运动和 Sim-to-Real 控制。

#### 4.5 Stable-Baselines3、CleanRL 与 TorchRL

这三个框架代表三种不同取向：

- **Stable-Baselines3**：强调稳定 API 和快速获得可信基线。
- **CleanRL**：强调一个脚本展示完整算法，适合阅读、复现与修改。
- **TorchRL**：强调可组合的基础设施，适合搭建自己的复杂训练系统。

如果任务只有几十个 CPU 环境，Stable-Baselines3 往往最省时间；如果目标是理解 PPO 每个张量怎样流动，CleanRL 更合适；如果需要自定义 collector、TensorDict、离线数据集和 replay pipeline，TorchRL 的长期扩展性更好。

#### 4.6 RLlib 与 Sample Factory

RLlib 适合跨机器、容错、多智能体和平台化管理，但它引入的分布式抽象对单机 Isaac 任务可能过重。Sample Factory 更专注高吞吐异步采样，适合单步环境较重、视觉观测较多或 CPU 环境数量很大的任务。

#### 4.7 skrl、rl_games 与 RSL-RL 的直接比较

| 维度 | skrl | rl_games | RSL-RL |
| --- | --- | --- | --- |
| 核心取向 | 模块化、研究扩展 | 高吞吐通用 PPO | 机器人运动专用 PPO |
| 算法覆盖 | 较广 | 主要强在 PPO/A2C | 主要强在 PPO |
| 修改算法 | 容易 | 中等偏难 | PPO 范围内较直接 |
| Isaac Lab 适配 | 强 | 强 | 强 |
| 足式/人形案例 | 有 | 有 | 非常多 |
| Off-policy 研究 | 更合适 | 不是主要优势 | 不是主要优势 |
| 上手难点 | 理解组件组合 | 理解配置和内部流程 | 适应其任务约定 |
| 首选情形 | 要改算法 | 要高效跑 PPO | 专注 locomotion |

需要注意：三者的性能不能脱离任务直接排序。相同 GPU 上的速度会受到环境数、网络规模、观测维度、仿真步长、渲染、mini-batch 和日志频率影响。可靠比较应固定这些变量，并同时报告环境步每秒、更新时间、显存占用和最终样本效率。

### 5. 策略网络架构

#### 5.1 MLP：低维本体状态的默认选择

关节位置、速度、IMU、目标速度等向量观测通常使用 MLP。它速度快、易于 GPU 批处理，是 locomotion 的主流编码器。

局限是无法自然处理图像、点云或变长对象集合，也没有时间记忆。

#### 5.2 CNN 与 ViT：视觉观测编码

CNN 具有较强局部归纳偏置和较低计算成本，适合 RGB、深度图和栅格地图。ViT 更适合大规模预训练和多模态融合，但对数据量、显存和推理延迟要求更高。

常见策略是先用预训练视觉模型得到 embedding，再让 RL 学习较小的 Actor-Critic；也可以端到端联合训练，但这通常需要更多数据并容易出现表征漂移。

#### 5.3 PointNet、稀疏卷积与几何编码器

点云、体素和稀疏三维观测可使用 PointNet 系列、稀疏卷积或几何 Transformer。它们保留三维几何，但预处理和批处理更复杂，训练吞吐量通常低于纯本体状态策略。

#### 5.4 RNN/LSTM/GRU：处理部分可观测性

当单帧观测无法推断速度、遮挡对象或历史事件时，可以在编码器后加入循环状态。

```text
observation ─► encoder ─► LSTM/GRU ─► actor/critic heads
                              ▲
                         hidden state
```

训练时必须正确处理 episode 边界、hidden state 重置、序列切片和 burn-in。简单地在普通 PPO 网络中插入 LSTM，若 rollout 与 mini-batch 打乱方式没有同步修改，结果往往是错误的。

#### 5.5 Transformer：长历史和多模态融合

Transformer 可以统一处理图像 token、语言 token、动作历史和机器人状态，适合长时程与多模态任务。Decision Transformer 则把强化学习转化为条件序列建模。

其代价是计算和内存随上下文长度增长，在线控制还必须满足延迟要求。高频底层控制通常仍使用小型 MLP，把 Transformer 放在较低频的高层更实际。

#### 5.6 Actor 与 Critic：共享还是分离

| 结构 | 优点 | 风险 | 常见场景 |
| --- | --- | --- | --- |
| 完全共享 encoder | 参数少、计算快 | Actor/Critic 梯度可能冲突 | 低维、简单任务 |
| 共享 encoder + 独立 head | 性能与成本平衡 | 仍存在表征干扰 | 常见视觉 Actor-Critic |
| 完全分离网络 | 优化更独立，可给 Critic 更多信息 | 参数与计算翻倍 | 非对称 Actor-Critic、复杂任务 |

具身训练中常使用 **asymmetric Actor-Critic**：Actor 只看真机可获得的观测，Critic 在训练时额外使用仿真器提供的特权状态，例如完整地形高度、物体真实位姿和外力。这样可以提高训练效率，同时保证部署时 Actor 不依赖不可获得的信息。

### 6. 其他重要架构

#### 6.1 模仿学习与强化学习混合

常见流程是先用 Behavior Cloning 学会基本行为，再用 RL 优化长期回报；也可以在 RL 损失中持续加入 imitation loss，防止策略偏离专家数据过远。

对灵巧操作和人形动作模仿而言，专家参考、动作先验或 adversarial motion prior 往往比纯奖励塑形更有效。

#### 6.2 Curriculum Learning

课程学习根据成功率逐步增加地形、速度、扰动、目标距离或任务难度。它不是独立 RL 算法，但属于重要的训练控制架构。

课程推进过快会导致策略崩溃，推进过慢则会过拟合简单任务。应明确课程状态是否写入 checkpoint，以及评估时是否固定难度分布。

#### 6.3 Domain Randomization 与 Sim-to-Real

训练时随机化质量、摩擦、执行器延迟、传感器噪声、地形、光照和纹理，使策略不能依赖单一仿真参数。

```text
parameter distribution ─► randomized simulator ─► robust policy
                                                    │
                                                    ▼
                                                real robot
```

随机化范围并非越大越好。范围过宽会把训练任务变得不必要地困难，甚至产生真机永远不会遇到的动力学。更可靠的方式是结合系统辨识确定中心和合理边界。

#### 6.4 Safety Layer 与约束强化学习

真实机器人通常在策略输出后增加安全层：动作限幅、速度/力矩限制、碰撞检测、控制屏障函数、MPC 或急停逻辑。

```text
policy action ─► safety filter ─► low-level controller ─► robot
                       │
                 reject / project
```

安全层会改变策略实际执行的动作，因此训练中最好模拟相同限制，否则容易形成 train-deploy mismatch。

#### 6.5 混合规划与控制架构

工程中的具身系统通常按时间尺度分层：

| 层级 | 典型频率 | 主要职责 | 常用方法 |
| --- | ---: | --- | --- |
| 任务层 | 0.1～1 Hz | 理解指令、分解任务 | 规则、行为树、LLM/VLM |
| 技能层 | 1～20 Hz | 选择目标、技能与局部动作 | RL、规划器、技能库 |
| 控制层 | 50～1000 Hz | 稳定跟踪与执行 | RL policy、MPC、WBC、PID |
| 安全层 | 等于或高于控制频率 | 限制危险动作 | 约束、过滤器、硬件保护 |

高层模型并不适合直接输出每个关节的高频力矩；低层策略也不擅长独自承担数分钟任务的语义规划。分层可以让不同方法工作在擅长的时间尺度。

#### 6.6 评估与部署架构

训练成功不等于可以部署。至少应把系统拆成三种运行模式：

- **Train**：允许随机动作、域随机化、特权 Critic 和大量日志。
- **Evaluation**：关闭探索噪声，固定任务分布，运行多随机种子并统计成功率、回报和安全指标。
- **Deployment**：只导出 Actor，固定观测归一化参数，满足实时延迟并连接安全层。

部署时最常见的问题包括：

- 训练与部署的关节顺序、单位、坐标系或控制频率不同。
- 忘记导出 observation normalization 的均值和方差。
- RNN hidden state 没有在任务结束或失联后重置。
- 策略输出超出执行器范围，或安全裁剪改变了训练时的动作分布。
- PyTorch 模型能运行，但推理延迟抖动无法满足实时线程要求。

## 细节

### 1. 选型决策表

| 项目条件 | 推荐算法 | 推荐训练架构 | 优先框架 |
| --- | --- | --- | --- |
| Isaac Lab、数千环境、连续运动控制 | PPO | 同步端到端 GPU | `rl_games` / RSL-RL |
| Isaac Lab、需要修改损失或 memory | PPO/SAC/自定义 | 同步 GPU 或 replay | `skrl` |
| 四足或人形 locomotion | PPO | 大规模同步 GPU | RSL-RL |
| 小中规模 Gymnasium 控制基线 | PPO/SAC/TD3 | 单机向量化 | Stable-Baselines3 |
| 学习或复现算法实现 | 视论文而定 | 单机、透明训练循环 | CleanRL |
| 复杂离线数据与自定义 collector | IQL/CQL/SAC | Replay/offline pipeline | TorchRL / Tianshou |
| 多机、多智能体和平台化运行 | MAPPO/QMIX 等 | 分布式 Actor-Learner | RLlib |
| 大规模视觉导航或昂贵 CPU 环境 | PPO/APPO | 异步采样 | Sample Factory |
| 真实机器人数据多、在线试错危险 | BC + Offline RL | 离线预训练 + 小步微调 | TorchRL / 自研框架 |

### 2. 框架评测时应记录什么

不要只看“每秒环境步数”。一份有意义的框架对比至少应固定并记录：

- GPU、CPU、驱动、仿真器和框架版本。
- 环境数量、仿真频率、控制 decimation 和 episode 长度。
- 观测、动作维度以及是否启用相机渲染。
- Actor/Critic 网络层数、宽度和循环结构。
- rollout length、mini-batch 数、epoch 数和学习率。
- 环境步每秒、采样时间、更新时间和总 wall-clock 时间。
- 峰值显存、CPU 内存和 GPU 利用率。
- 达到目标回报所需环境步数与实际时间。
- 至少 3～5 个随机种子的均值和方差。

一个框架可能 FPS 更高，却需要更多样本才能收敛；另一个框架单步慢，但算法实现或默认超参数使最终 wall-clock 更短。因此要同时衡量**系统吞吐量、样本效率和最终性能**。

### 3. Isaac Lab 项目的推荐目录分层

```text
project/
├── envs/                 # 场景、机器人、观测、动作、奖励、终止条件
├── agents/
│   ├── skrl_cfg.yaml
│   ├── rl_games_cfg.yaml
│   └── rsl_rl_cfg.py
├── models/               # 自定义 encoder、actor、critic、memory
├── train.py              # 训练入口
├── play.py               # 无探索评估与可视化
├── export.py             # TorchScript/ONNX 等导出逻辑
├── deployment/           # 真机观测映射、控制接口和安全限制
└── tests/                # reward、reset、坐标系和导出一致性测试
```

环境定义与算法配置应分开。这样可以让同一任务在 `skrl`、`rl_games` 和 RSL-RL 之间做公平对比，也能避免奖励函数依赖某个框架的内部数据结构。

### 4. 常见误区

#### 误区一：框架支持 PPO，所以结果应该相同

不同实现对 advantage normalization、value clipping、动作分布标准差、time-limit truncation、学习率调度和 observation normalization 的处理可能不同。即使配置名称相同，训练行为也未必相同。

#### 误区二：并行环境越多越好

环境数增加会提高数据吞吐量，但也会扩大每次 rollout 的 batch，使单位环境步对应的更新次数下降。若不同时调整 rollout、mini-batch 和学习率，样本效率可能下降。

#### 误区三：仿真在 GPU 就没有数据瓶颈

Python 侧逐环境循环、频繁 `.cpu()`、日志打印、视频录制、相机渲染以及不连续张量，都可能导致同步或复制开销。

#### 误区四：训练完成后只需导出权重

部署还需要完整保存观测顺序、缩放、归一化、动作缩放、默认关节位置、历史窗口、RNN 状态和控制周期。权重只是策略契约的一部分。

#### 误区五：端到端策略一定比模块化系统先进

端到端策略减少了人工接口，但调试、安全验证和长时程泛化更困难。真实具身系统通常采用模块化边界，在局部使用端到端学习。

### 5. 一个实际的选择顺序

1. 先确定环境：Isaac Lab、MuJoCo、ManiSkill、Habitat 或真实机器人。
2. 根据动作空间和数据成本选择算法族：大规模仿真 PPO，重视复用 SAC/TD3，固定数据集选 Offline RL。
3. 根据环境计算位置选择训练架构：单机同步 GPU、CPU 异步或分布式 Actor-Learner。
4. 再选择框架：性能优先选专用实现，研究扩展优先选模块化实现。
5. 确定策略网络：低维 MLP，视觉 CNN/ViT，部分可观测任务加入 RNN/Transformer。
6. 从第一天就定义评估、导出、观测契约和安全层，不要等训练收敛后再补。

## 复盘

- 讨论强化学习“架构”时，应先说明是在谈算法、训练系统、软件框架、网络还是完整机器人系统。
- 对具身智能而言，算法创新之外，GPU 数据流、环境并行、观测契约、课程学习、域随机化和部署安全同样决定最终效果。
- `rl_games` 的优势是成熟的高吞吐 PPO，RSL-RL 的优势是足式和人形运动生态，`skrl` 的优势是模块化与研究扩展；不存在脱离任务条件的绝对最优框架。
- 可复现的比较必须控制环境、网络和超参数，并同时报告吞吐量、样本效率、收敛性能和资源消耗。
- 复杂具身任务的长期方向通常是多种架构组合：预训练表征或世界模型负责理解，高层规划负责长时任务，RL 技能负责适应性动作，传统控制和安全层保证可执行性。

## 参考

- [skrl documentation](https://skrl.readthedocs.io/)
- [skrl GitHub repository](https://github.com/Toni-SM/skrl)
- [rl_games GitHub repository](https://github.com/Denys88/rl_games)
- [RSL-RL GitHub repository](https://github.com/leggedrobotics/rsl_rl)
- [Isaac Lab documentation](https://isaac-sim.github.io/IsaacLab/)
- [Stable-Baselines3 documentation](https://stable-baselines3.readthedocs.io/)
- [CleanRL documentation](https://docs.cleanrl.dev/)
- [TorchRL documentation](https://docs.pytorch.org/rl/)
- [Ray RLlib documentation](https://docs.ray.io/en/latest/rllib/)
- [Tianshou documentation](https://tianshou.org/)
- [Sample Factory documentation](https://www.samplefactory.dev/)
- [Gymnasium documentation](https://gymnasium.farama.org/)
- [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)
- [Soft Actor-Critic Algorithms and Applications](https://arxiv.org/abs/1812.05905)
- [Mastering Diverse Domains through World Models](https://arxiv.org/abs/2301.04104)
- [Offline Reinforcement Learning: Tutorial, Review, and Perspectives on Open Problems](https://arxiv.org/abs/2005.01643)
