import os

for path in ['/tmp', '/private/tmp', '/var/tmp', '.', '/dev']:
    try:
        fname = os.path.join(path, 'write_test_file')
        with open(fname, 'w') as f:
            f.write('hi')
        print('wrote to', path)
        os.remove(fname)
    except Exception as e:
        print('cannot write to', path, e)
