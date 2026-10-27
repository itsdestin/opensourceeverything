# Turns texts into meaning vectors with BAAI/bge-small-en-v1.5 on this computer (the same model the Worker uses).
# Reads a JSON list of texts on stdin, prints a JSON list of 384-number vectors on stdout.
# Used by site/embed-items.mjs --local and site/test/search-ai-eval.mjs. Needs: pip install fastembed
# (model files are downloaded to FASTEMBED_CACHE or /tmp, never into the repo).
import json, os, sys
from fastembed import TextEmbedding
m = TextEmbedding('BAAI/bge-small-en-v1.5', cache_dir=os.environ.get('FASTEMBED_CACHE', '/tmp/ose-embed-models'))
texts = json.load(sys.stdin)
print(json.dumps([[round(float(x), 6) for x in v] for v in m.embed(texts)]))
