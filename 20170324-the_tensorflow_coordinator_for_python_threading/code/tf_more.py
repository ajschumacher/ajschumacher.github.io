import time
import threading
import tensorflow as tf


def sleep_politely(coord):
    with coord.stop_on_exception():
        while not coord.should_stop():
            time.sleep(2)

coord = tf.train.Coordinator()
threads = [threading.Thread(target=sleep_politely, args=(coord,))
           for _ in range(4)]

try:
    for thread in threads:
        thread.start()
    time.sleep(5)
except Exception as exception:
    coord.request_stop(exception)
finally:
    coord.request_stop()
    coord.join(threads)
