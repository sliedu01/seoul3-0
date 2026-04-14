import os

# Use the actual path
path = os.path.join('c:', os.sep, '\uc11c\uc6184 3.0', 'src', 'app', 'surveys', 'page.tsx')
print('Reading:', path)

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('Total lines:', len(lines))

# Remove lines 1254 to 1511 (0-indexed), keep everything else
kept = lines[:1254] + lines[1511:]

print('Lines after removal:', len(kept))

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.writelines(kept)

print('Done!')
