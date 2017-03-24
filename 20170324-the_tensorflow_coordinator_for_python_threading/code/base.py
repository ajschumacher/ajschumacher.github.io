import time
import threading


def sleep_politely(should_stop):
    while not should_stop():
        time.sleep(2)

SHOULD_STOP = False
should_stop = lambda: SHOULD_STOP
threads = [threading.Thread(target=sleep_politely, args=(should_stop,))
           for _ in range(4)]

for thread in threads:
    thread.start()
time.sleep(5)
SHOULD_STOP = True
for thread in threads:
    thread.join()
