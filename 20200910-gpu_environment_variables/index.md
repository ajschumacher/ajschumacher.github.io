# GPU environment variables

`CUDA_DEVICE_ORDER` can default to `FASTEST_FIRST`, which may not
match the order you see in `nvidia-smi` output. Use
`CUDA_DEVICE_ORDER=PCI_BUS_ID`.

Set `CUDA_VISIBLE_DEVICES=2` to only run on GPU 2. That GPU will then
be accessed as GPU 0, not GPU 2.

When using TensorFlow, you [can][] set
`TF_FORCE_GPU_ALLOW_GROWTH=true` to keep TF from preemptively claiming
all the GPU memory. However, in my tests (with the older version 1.14)
TF still allocates way more memory than it really needs, so this
setting doesn't help much in practice.

[can]: https://www.tensorflow.org/guide/gpu#limiting_gpu_memory_growth
