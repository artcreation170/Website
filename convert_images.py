#!/usr/bin/env python3
"""
convert_images.py
Simple script to convert JPG/PNG images under ./images to WebP using Pillow.
Run:
  pip install -r requirements.txt
  python convert_images.py --quality 80

This will write .webp files alongside originals.
"""
import os
from PIL import Image
import argparse

EXTS = ('.jpg', '.jpeg', '.png')

def convert_file(path, quality=80):
    out = os.path.splitext(path)[0] + '.webp'
    try:
        img = Image.open(path)
        img = img.convert('RGB')
        img.save(out, 'WEBP', quality=quality)
        print('Saved', out)
    except Exception as e:
        print('Failed', path, e)

def walk_and_convert(root='images', quality=80):
    for dirpath, dirs, files in os.walk(root):
        for f in files:
            if f.lower().endswith(EXTS):
                full = os.path.join(dirpath, f)
                convert_file(full, quality=quality)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', default='images')
    p.add_argument('--quality', type=int, default=80)
    args = p.parse_args()
    walk_and_convert(args.root, quality=args.quality)

if __name__ == '__main__':
    main()
