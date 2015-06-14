# Setting up the NVIDIA Jetson TK1

Let's do [deep learning](https://en.wikipedia.org/wiki/Deep_learning) on a [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit)!

Go!


![Jetson TK1](jetson.png)

*[Image from Gareth Halfacree](https://www.flickr.com/photos/120586634@N05/14488628209/in/album-72157645736592714/).*


There's a little work involved in setting up the Jetson. In outline:

 1. Flash the Jetson to most recent OS (L4T 21.3).
 2. Install the [Caffe](http://caffe.berkeleyvision.org/) deep learning framework.
 3. Train a deep net on some image data.

Without extra hardware, the easiest way to start working with the Jetson is to plug it in directly to your router with an ethernet cable. Then you can `ssh` in to `tegra-ubuntu` on the local network, using the default username and password (both `ubuntu`):

```bash
ssh ubuntu@tegra-ubuntu.local
```


### 1. Flash the Jetson to the most recent OS (L4T 21.3)

The GPU on the Jetson is a Tegra TK1. The Jetson I received came with an [early version](https://developer.nvidia.com/linux-tegra-rel-19) of the "[Linux for Tegra](https://developer.nvidia.com/linux-tegra)" (L4T) Ubuntu-based operating system. I'm not sure how much difference it makes, but I thought I'd better update to the most recent version (currently [21.3](https://developer.nvidia.com/linux-tegra-r213)).

I flashed with the [Jetson TK1 Development Pack](https://developer.nvidia.com/jetson-tk1-development-pack). Two things about the Development Pack:

 * You can only run the Development Pack on 64-bit Ubuntu 12.04 and 14.04. I used 14.04.
 * The Development Pack is about 12 gigabytes in size, so make sure you have enough space on your machine or any virtual machine you plan to use.

I'm running a Mac over here, so I used [VirtualBox](https://www.virtualbox.org/) (4.3.28, plus the extension pack) to install a virtual [Ubuntu Desktop](http://www.ubuntu.com/download/desktop) 14.04.2 LTS from ISO. I hadn't created a VirtualBox image this way before; it's pretty cool! You can tell VirtualBox that the ISO is in a virtual DVD drive, and boot from it. An NVIDIA Developer Zone [post](https://devtalk.nvidia.com/default/topic/718220/tegra-tools/jetson-tegra-k1-development-kit/) was very helpful in figuring all this out. Takes me back to the days when you had to burn an ISO to a physical CD...

It took me a couple tries to get everything right; to get it all done in one pass you would want to connect the Jetson via USB and start it in recovery mode now, then adjust the VirtualBox settings so that there's a "USB Device Filter" for the "NVIDIA Corp. APX [0101]" device accessible, before even installing the VM.

There was one headache in getting the Ubuntu desktop to display at reasonable resolutions. The display resolution started at 640 by 480, with no apparent way to change it. Thanks to [Jonathan Davis](http://askubuntu.com/users/394518/johnathan-davis) for [suggesting](http://askubuntu.com/questions/588943/experiencing-small-resolution-issue-in-ubuntu-14-04-2-with-virtualbox-getting-s) a solution that worked for me:

```bash
sudo apt-get remove libcheese-gtk23
sudo apt-get install xserver-xorg-core
sudo apt-get install -f virtualbox-guest-x11
```

Reboot and get full-screen majesty!

In Ubuntu then I installed the [Jetson TK1 Development Pack](https://developer.nvidia.com/jetson-tk1-development-pack). This whole process takes at least enough time to eat some Thai food.

After flashing, I cleaned out the old record from `~/.ssh/known_hosts`, and was able to log in to a shiny new up-to-date Linux for Tegra install!

```bash
ssh ubuntu@tegra-ubuntu.local
```

At the end of the Development Pack process, you need to enter the IP address of your Jetson. You can use `ifconfig` (as directed) on the Jetson to get the right IP address.

The Development Pack process continues then and includes installing more things on the Jetson, including `cuda-toolkit-6-5`. Nice!

The Development Pack also includes [OpenCV](http://opencv.org/), but doesn't seem to install it on the Jetson automatically. So you have to move this file onto the Jetson yourself:

```bash
JetPackTK1-1.1/jetpack_download/libopencv4tegra-repo_l4t-r21_2.4.10.1_armhf.deb
```

On the Jetson then, install something like the following. The package itself contains three other packages which have to be installed, and which have a couple dependencies that will need to be resolved:

```bash
sudo dpkg -i libopencv4tegra-repo_l4t-r21_2.4.10.1_armhf.deb
sudo apt-get install libavcodec54 libavformat54 libavutil52 libswscale2
sudo dpkg -i /var/opencv4tegra-repo/libopencv4tegra_2.4.10.1_armhf.deb
sudo dpkg -i /var/opencv4tegra-repo/libopencv4tegra-dev_2.4.10.1_armhf.deb
sudo dpkg -i /var/opencv4tegra-repo/libopencv4tegra-python_2.4.10.1_armhf.deb
```

If you're a "CUDA Registered Developer" (they have to manually approve applications?) now might be a good time to install [cuDNN](https://developer.nvidia.com/cuDNN) R1.


### 2. Install the Caffe deep learning framework.

Pete Warden's [post](http://petewarden.com/2014/10/25/how-to-run-the-caffe-deep-learning-vision-library-on-nvidias-jetson-mobile-gpu-board/) on setting up Caffe on the Jetson isn't all perfectly applicable after you've flashed to L4T 21.3, but I very much appreciated his translation of the [install](http://caffe.berkeleyvision.org/installation.html) dependencies into Ubuntu package names:

```bash
sudo apt-get install \
    libprotobuf-dev protobuf-compiler gfortran \
    libboost-dev cmake libleveldb-dev libsnappy-dev \
    libboost-thread-dev libboost-system-dev \
    libatlas-base-dev libhdf5-serial-dev libgflags-dev \
    libgoogle-glog-dev liblmdb-dev gcc-4.7 g++-4.7
```

Warden also advised some manual tweaks to `$PATH` and `$LD_LIBRARY_PATH`, but these are taken care of already by the install process. You may still need to `source ~/.bashrc`, depending on when you last logged in.

To get Python integration compiled you need `numpy`:

```bash
sudo apt-get install python-numpy
```

It looks like it's best to install Caffe from the `master` branch of the GitHub repository. (The `dev` branch hasn't been updated in three months.) No problem; the [install](http://caffe.berkeleyvision.org/installation.html) directions will work fine once the files are in place:

```bash
sudo apt-get install git
git clone https://github.com/BVLC/caffe.git
cd caffe
cp Makefile.config.example Makefile.config
make all
make test
```


### 3. Train a deep net on some image data.

I think I'll try to reproduce the [MNIST tutorial](http://caffe.berkeleyvision.org/gathered/examples/mnist.html) first.
