import time
import threading
import tensorflow as tf


def sleep_politely(coord):
    while not coord.should_stop():
        time.sleep(2)

coord = tf.train.Coordinator()
threads = [threading.Thread(target=sleep_politely, args=(coord,))
           for _ in range(4)]

for thread in threads:
    thread.start()
time.sleep(5)
coord.request_stop()
coord.join(threads)
