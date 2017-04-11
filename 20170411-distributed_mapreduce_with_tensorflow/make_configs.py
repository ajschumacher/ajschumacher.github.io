import json

cluster = {'files': ['localhost:2222'],
           'reduce': ['localhost:2223'],
           'map': ['localhost:2224', 'localhost:2225']}
for task_type, addresses in cluster.items():
    for index in range(len(addresses)):
        tf_config = {'cluster': cluster,
                     'task': {'type': task_type,
                              'index': index}}
        tf_config_string = json.dumps(tf_config, indent=2)
        with open('config_{}_{}.sh'.format(task_type, index), 'w') as f:
            f.write("export TF_CONFIG='{}'\n".format(tf_config_string))
            # GPUs won't be needed, so prevent accessing GPU memory.
            f.write('export CUDA_VISIBLE_DEVICES=-1\n')
