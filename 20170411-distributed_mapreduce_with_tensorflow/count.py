from __future__ import print_function

import time
import tensorflow as tf

config = tf.contrib.learn.RunConfig()
server = tf.train.Server(config.cluster_spec,
                         job_name=config.task_type,
                         task_index=config.task_id)
session = tf.Session(server.target)

with tf.device('/job:files/task:0'):
    filename_queue = tf.FIFOQueue(capacity=10, dtypes=[tf.string],
                                  shared_name='filename_queue')

if config.task_type == 'files':
    filename_to_enqueue = tf.placeholder(tf.string)
    enqueue_filename = filename_queue.enqueue(filename_to_enqueue)
    close_filename_queue = filename_queue.close()
    for line in open('filenames.txt'):
        filename = line.strip()
        session.run(enqueue_filename,
                    feed_dict={filename_to_enqueue: filename})
    session.run(close_filename_queue)
    server.join()

with tf.device('/job:reduce/task:0'):
    total_word_count = tf.Variable(0, name='total')

if config.task_type == 'reduce':
    initializer = tf.global_variables_initializer()
    session.run(initializer)
    while True:
        total_word_count_now = session.run(total_word_count)
        print('{} words so far'.format(total_word_count_now))
        time.sleep(2)

if config.task_type == 'map':
    filename_from_queue = filename_queue.dequeue()
    word_count_to_add = tf.placeholder(tf.int32)
    add_to_total = tf.assign(total_word_count,
                             total_word_count + word_count_to_add)
    while True:
        filename = session.run(filename_from_queue)
        text = open(filename).read()
        this_word_count = len(text.split())
        time.sleep(5)
        print('{} words in {}'.format(this_word_count, filename))
        session.run(add_to_total,
                    feed_dict={word_count_to_add: this_word_count})
