# The "3-Step" Fast Install Procedure

To ensure you get the CPU-only versions (saving you ~3GB of space and 15 minutes of waiting), run your installation in this exact order:

## Step 1: Install the lightweight Torch

```Bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```
## Step 2: Install the lightweight TensorFlow

```Bash
pip install tensorflow-cpu
```

## Step 3: Install everything else

```Bash
pip install -r requirements-api.txt
```