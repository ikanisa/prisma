import sys, importlib
print('sitecustomize loaded initially?', 'sitecustomize' in sys.modules)
try:
    importlib.import_module('sitecustomize')
    print('manual import succeeded')
except Exception as e:
    print('manual import failed', e)
print('loaded after?', 'sitecustomize' in sys.modules)
