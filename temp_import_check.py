import sys
print('initial', sys.path[:3])
print('sitecustomize in modules?', 'sitecustomize' in sys.modules)
try:
    import sitecustomize as s
    print('imported sitecustomize', s.__file__)
except Exception as e:
    print('failed import', e)
