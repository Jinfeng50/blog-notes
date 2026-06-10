---
summary: 在共享 8×A800-80GB 集群上复现 openpi π0.5 官方 LIBERO checkpoint baseline，记录评测协议、命令、结果和踩坑。
tags:
  - Robotics
  - VLA
  - LIBERO
  - openpi
  - 实验复现
date: 2026-06-10
comments: true
---

# 手把手在共享 A800 集群上跑通 π0.5 LIBERO 评测

> 这篇文章记录我在一台 8×A800-80GB 共享服务器上，复现 Physical Intelligence 开源 openpi 项目中 π0.5 官方 LIBERO checkpoint baseline 的全过程。
>
> 最终结果：按照 openpi 官方协议，每个 task 50 episodes，四个 suite 共 2000 episodes，复现得到平均成功率 96.60%，与 openpi README 里的 96.85% 基本一致。

## 背景

我最近在系统复现 Physical Intelligence 的 π0.5 VLA 模型。后续目标是从 `pi05_base` 微调到 LIBERO，并进一步尝试多模态融合，但在真正训练之前，我认为第一步必须先把官方 checkpoint 的评测跑通。

原因很简单：如果官方 checkpoint 都跑不出接近官方的数字，那后面自己训练出来的结果就没有可信度。问题可能出在 LIBERO 环境、图像预处理、policy server 通信、norm stats、checkpoint 路径、版本依赖，甚至是评测 episode 数量。先用官方权重做 baseline，可以把这些工程问题提前暴露出来。

这次我复现的是 openpi 官方提供的 `pi05_libero` checkpoint：

```text
gs://openpi-assets/checkpoints/pi05_libero
```

对应 openpi 官方参考结果来自 `examples/libero/README.md`：

| Model | Spatial | Object | Goal | Libero 10 | Average |
|---|---:|---:|---:|---:|---:|
| π0.5 @ 30k official ckpt | 98.8 | 98.2 | 98.0 | 92.4 | 96.85 |

## 结论

- 官方 checkpoint 在本地 A800 共享集群上可以复现到 96.60% 平均成功率。
- 评测必须使用官方协议：4 个 suite、每个 suite 10 个 task、每个 task 50 episodes，总计 2000 episodes。
- 快速 sanity check 可以用 10 episodes/task，但不能直接和官方 README 的数字对比。
- 影响结果可信度的关键点是 checkpoint 路径、LIBERO 环境、server-client 通信、episode 数量和 websocket 稳定性。

## 官方评测协议

这一步很容易踩坑。我一开始只跑了每个 task 10 episodes，数字看起来也不错，但后来发现这不能直接和官方结果对比。

openpi 的 LIBERO 评测入口是：

```text
examples/libero/main.py
```

关键默认参数：

```python
num_trials_per_task: int = 50
seed: int = 7
resize_size: int = 224
replan_steps: int = 5
num_steps_wait: int = 10
```

LIBERO 四个常用 suite 是：

```text
libero_spatial
libero_object
libero_goal
libero_10
```

每个 suite 有 10 个 task。官方协议是每个 task 跑 50 episodes，也就是：

```text
10 tasks × 50 episodes = 500 episodes/suite
4 suites × 500 episodes = 2000 episodes total
```

所以最终是否完整，不能看视频数量，而要看日志里是否出现：

```text
Total episodes: 500
```

## 过程：启动 policy server

openpi 的推理是 server-client 架构。先启动 policy server，加载模型和 checkpoint；再由 LIBERO eval 脚本通过 websocket 发送观测、接收动作。

我使用 8001 端口，因为当时 8000 已经被其他进程占用。

```bash
cd /chenjinfeng/projects/openpi

export OPENPI_DATA_HOME=/chenjinfeng/openpi_cache
export HF_HOME=/chenjinfeng/hf_cache
export HF_LEROBOT_HOME=/chenjinfeng/datasets
export TMPDIR=/chenjinfeng/tmp
export MUJOCO_GL=egl
export XLA_PYTHON_CLIENT_MEM_FRACTION=0.9

CUDA_VISIBLE_DEVICES=5 uv run scripts/serve_policy.py \
    --port=8001 \
    policy:checkpoint \
    --policy.config=pi05_libero \
    --policy.dir=/cfsdata/chenjinfeng/models/openpi/pi05_libero
```

这里有一个小细节：`--port=8001` 必须放在 `policy:checkpoint` 子命令前面。因为 openpi 用的是 `tyro` 解析命令行，子命令后面的参数会被解析成 checkpoint 子命令自己的参数。如果写成下面这样会报错：

```bash
uv run scripts/serve_policy.py policy:checkpoint ... --port=8001
```

错误类似：

```text
Unrecognized options: --port=8001
```

正确顺序是：

```bash
uv run scripts/serve_policy.py --port=8001 policy:checkpoint ...
```

## 过程：启动 LIBERO 评测

eval 端需要能 import LIBERO。我的 `openpi/third_party/libero` 当时是空的，所以需要显式把 LIBERO 源码加进 `PYTHONPATH`：

```bash
export PYTHONPATH=/chenjinfeng/projects/LIBERO:$PYTHONPATH
```

完整评测命令如下：

```bash
cd /chenjinfeng/projects/openpi/examples/libero

export OPENPI_DATA_HOME=/chenjinfeng/openpi_cache
export HF_HOME=/chenjinfeng/hf_cache
export HF_LEROBOT_HOME=/chenjinfeng/datasets
export TMPDIR=/chenjinfeng/tmp
export MUJOCO_GL=egl
export PYTHONPATH=/chenjinfeng/projects/LIBERO:$PYTHONPATH

RUN_ID=baseline_official_50ep_$(date +%Y%m%d_%H%M)
RESULTS=/chenjinfeng/projects/openpi-libero-reproduction/experiments/$RUN_ID
VIDEOS=chenjinfeng/datasets/eval_videos/$RUN_ID
mkdir -p "$RESULTS" "$VIDEOS"

for SUITE in libero_spatial libero_object libero_goal libero_10
do
    echo "=== Evaluating $SUITE with official 50 episodes/task protocol ==="
    uv run main.py \
        --args.task-suite-name "$SUITE" \
        --args.host=localhost \
        --args.port=8001 \
        --args.video-out-path "$VIDEOS/$SUITE" \
        2>&1 | tee "$RESULTS/eval_${SUITE}.log"
done

echo "suite,total_success_rate,total_episodes" > "$RESULTS/sr_summary.csv"
for SUITE in libero_spatial libero_object libero_goal libero_10
do
    LOG="$RESULTS/eval_${SUITE}.log"
    SR=$(grep "Total success rate:" "$LOG" | tail -1 | awk '{print $NF}')
    EP=$(grep "Total episodes:" "$LOG" | tail -1 | awk '{print $NF}')
    echo "$SUITE,$SR,$EP" >> "$RESULTS/sr_summary.csv"
done

cat "$RESULTS/sr_summary.csv"
```

这段命令里最重要的是：不要传 `--args.num-trials-per-task 10`。不传这个参数时，脚本使用默认值 50，才是官方协议。

## 结果

完整 run：

```text
baseline_official_50ep_20260607_1246
```

原始 summary：

```csv
suite,total_success_rate,total_episodes
libero_spatial,0.982,500
libero_object,0.988,500
libero_goal,0.968,500
libero_10,0.926,500
```

换算成百分比后：

| Suite | Episodes | openpi Reference | Mine | Delta |
|---|---:|---:|---:|---:|
| Spatial | 500 | 98.8 | 98.2 | -0.6 |
| Object | 500 | 98.2 | 98.8 | +0.6 |
| Goal | 500 | 98.0 | 96.8 | -1.2 |
| Libero 10 | 500 | 92.4 | 92.6 | +0.2 |
| **Average** | 2000 | **96.85** | **96.60** | **-0.25** |

这个结果和 openpi 官方 README 基本一致。平均只差 0.25 个百分点，在仿真随机性和运行环境差异下可以接受。

LIBERO-Spatial成功案例展示：
<video controls muted playsinline preload="metadata" width="100%">
    <source src="/media/pi05-libero-baseline/rollout_pick_up_the_black_bowl_from_table_center_and_place_it_on_the_plate_success.mp4" type="video/mp4">
  </video>

LIBERO-Object成功案例展示：
<video controls muted playsinline preload="metadata" width="100%">
    <source src="/media/pi05-libero-baseline/rollout_pick_up_the_alphabet_soup_and_place_it_in_the_basket_success.mp4" type="video/mp4">
  </video>

LIBERO-long成功案例展示：
<video controls muted playsinline preload="metadata" width="100%">
    <source src="/media/pi05-libero-baseline/rollout_pick_up_the_book_and_place_it_in_the_back_compartment_of_the_caddy_success.mp4" type="video/mp4">
  </video>

失败案例展示：
<video controls muted playsinline preload="metadata" width="100%">
    <source src="/media/pi05-libero-baseline/rollout_put_the_white_mug_on_the_left_plate_and_put_the_yellow_and_white_mug_on_the_right_plate_failure.mp4" type="video/mp4">
  </video>

## 踩坑记录

### 10 episodes/task 不能作为正式 baseline

我第一次快速验证时跑的是：

```bash
--args.num-trials-per-task 10
```

得到的是每个 suite 100 episodes：

| Suite | Episodes | Success Rate |
|---|---:|---:|
| Spatial | 100 | 99.0 |
| Object | 100 | 100.0 |
| Goal | 100 | 97.0 |
| Libero 10 | 100 | 94.0 |

这些数字看起来很好，但样本量只有官方协议的 1/5，只能当 sanity check。真正写进 README 或简历时，必须使用 50 episodes/task。

### `ModuleNotFoundError: No module named 'libero'`

报错：

```text
ModuleNotFoundError: No module named 'libero'
```

原因是 eval 端的 Python 环境没有找到 LIBERO 包。我的解决方式是：

```bash
export PYTHONPATH=/cfsdata/chenjinfeng/projects/LIBERO:$PYTHONPATH
```

如果是从头搭环境，也可以考虑：

```bash
uv pip install -e /cfsdata/chenjinfeng/projects/LIBERO
```

但为了避免修改太多环境状态，我这次采用了显式 `PYTHONPATH`。

### websocket keepalive timeout 导致 success 全 0

中间有一次评测出现 success 全 0。查看日志发现不是模型真的失败，而是 websocket 连接断了：

```text
keepalive ping failed
ConnectionClosedError: sent 1011 internal error keepalive ping timeout
Caught exception ...
Success: False
```

`examples/libero/main.py` 会捕获 episode 内异常，然后把这一条记成失败。因此只看 success 全 0 很容易误判。

原因是 policy server 在 JAX 首次编译或较慢推理时阻塞，websocket keepalive ping 超时。我的临时修复是在 client 和 server 侧关闭 keepalive ping：

```python
ping_interval=None
ping_timeout=None
```

修改位置：

```text
packages/openpi-client/src/openpi_client/websocket_client_policy.py
src/openpi/serving/websocket_policy_server.py
```

修复后重新跑完整 50ep/task，日志里没有 `Caught exception` 和 `keepalive`，结果恢复正常。

### `EGL_NOT_INITIALIZED` 退出警告

每个 suite 跑完后，有时会在退出阶段看到：

```text
OpenGL.raw.EGL._errors.EGLError: EGL_NOT_INITIALIZED
```

这个出现在 robosuite / EGL context 析构阶段。如果日志已经打印了：

```text
Total success rate: ...
Total episodes: 500
```

那么它不影响评测结果。

### 视频数量不是 500 个

`main.py` 保存视频时，文件名基于 task description 和 success/failure：

```text
rollout_<task_description>_success.mp4
rollout_<task_description>_failure.mp4
```

同一个 task 的多次 rollout 会覆盖同名视频，所以视频文件数量远小于 500。这不是评测不完整。完整性要看日志里的：

```text
Total episodes: 500
```

## 复盘

这次 baseline 跑通以后，至少确认了几件事：

1. `pi05_libero` 官方 checkpoint 本地加载是正确的。
2. LIBERO 仿真环境、相机图像预处理、policy server-client 通信链路是正确的。
3. 评测协议已经和 openpi 官方 README 对齐。
4. 后续如果自己从 `pi05_base` 微调，评测结果可以和这组 baseline 做公平对比。

下一步我会做 `pi05_base -> LIBERO` 的全量微调。A800 单卡有 80 GB 显存，理论上不需要 LoRA，可以先跑 1 卡 full fine-tuning，再根据资源情况考虑 2 卡 FSDP。

## 可复现材料

结果文档：

```text
/cfsdata/chenjinfeng/projects/openpi-libero-reproduction/docs/baseline.md
```

完整日志：

```text
/cfsdata/chenjinfeng/projects/openpi-libero-reproduction/experiments/baseline_official_50ep_20260607_1246
```

视频目录：

```text
/cfsdata/chenjinfeng/datasets/eval_videos/baseline_official_50ep_20260607_1246
```

核心结果：

```text
Spatial:   98.2
Object:    98.8
Goal:      96.8
Libero 10: 92.6
Average:   96.60
```

这组结果就是我后续所有 LIBERO 微调实验的官方 checkpoint 对照组。

---

## 生成 GIF 的命令

如果平台不方便直接上传 mp4，可以把视频转成 GIF：

```bash
ffmpeg -i /cfsdata/chenjinfeng/datasets/eval_videos/baseline_official_50ep_20260607_1246/libero_10/rollout_put_both_the_cream_cheese_box_and_the_butter_in_the_basket_success.mp4 \
    -vf "fps=10,scale=480:-1:flags=lanczos" \
    -loop 0 /cfsdata/chenjinfeng/projects/blogs/pi05_libero_long_success.gif
```

## 参考

- [Physical Intelligence openpi](https://github.com/Physical-Intelligence/openpi)
- [LIBERO benchmark](https://github.com/Lifelong-Robot-Learning/LIBERO)
