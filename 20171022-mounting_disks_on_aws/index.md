# Mounting Disks on AWS

I don't hand-mount disks much these days, but sometimes I want to spin up a quick [EC2](https://aws.amazon.com/ec2/) instance to hammer something out, and I want to use the fast [SSD](https://en.wikipedia.org/wiki/Solid-state_drive) storage that comes with some instances, and those disks don't auto-mount.

Amazon has [some documentation](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/add-instance-store-volumes.html#making-instance-stores-available-on-your-instances) but it isn't quite enough for me by itself. Here are commands that have served me well on Ubuntu:

```bash
df -h  # see what's already mounted
lsblk  # find out the /dev/ paths of devices, like say /dev/xvdb
mkfs.ext4 /dev/xvdb  # format a disk using the Ext4 filesystem
mkdir disk  # make a mount point
mount /dev/xvdb disk  # mount the disk
df -h  # check for success and size of the new disk
chown ubuntu disk1  # make the disk accessible to the admin account
```

Some of those will need `sudo`.

I don't really know that Ext4 is the best filesystem to use; let me know if some other one is better!

Some instances come with multiple SSDs, in which case it might be fun to use them in a [RAID-0](https://en.wikipedia.org/wiki/Standard_RAID_levels#RAID_0) configuration for even more speed. I haven't tried this yet, but there is some [documentation](http://www.tldp.org/HOWTO/Software-RAID-HOWTO-5.html#ss5.5) to start from. Has anyone tried this?
