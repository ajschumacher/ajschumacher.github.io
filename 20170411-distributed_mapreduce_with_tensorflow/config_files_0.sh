export TF_CONFIG='{
  "cluster": {
    "files": [
      "localhost:2222"
    ], 
    "map": [
      "localhost:2224", 
      "localhost:2225"
    ], 
    "reduce": [
      "localhost:2223"
    ]
  }, 
  "task": {
    "index": 0, 
    "type": "files"
  }
}'
export CUDA_VISIBLE_DEVICES=-1
