import argparse
import os
import cv2
import numpy as np

from gfpgan import GFPGANer

# ============================================
# PARSE ARGUMENTS
# ============================================

def parse_args():
    parser = argparse.ArgumentParser(description='Run GFPGAN enhancement')
    parser.add_argument('--input', required=True, help='Input image path')
    parser.add_argument('--output', required=True, help='Output image path')
    parser.add_argument('--weight', default='../weights/GFPGANv1.4.pth', help='GFPGAN weight path relative to script dir')
    parser.add_argument('--upscale', type=int, default=1, help='Upscale factor')
    parser.add_argument('--arch', default='clean', help='GFPGAN architecture')
    parser.add_argument('--channel_multiplier', type=int, default=2, help='Channel multiplier')
    return parser.parse_args()


# ============================================
# RUN ENHANCEMENT
# ============================================

def run_gfpgan(input_path, output_path, weight_path, upscale=1, arch='clean', channel_multiplier=2):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if not os.path.isabs(weight_path):
        weight_path = os.path.join(script_dir, weight_path)

    restorer = GFPGANer(
        model_path=weight_path,
        upscale=upscale,
        arch=arch,
        channel_multiplier=channel_multiplier,
        bg_upsampler=None
    )

    img = cv2.imread(input_path)
    if img is None:
        raise FileNotFoundError(f'Input image not found: {input_path}')

    _, _, output = restorer.enhance(
        img,
        has_aligned=False,
        only_center_face=False,
        paste_back=True
    )

    blended = cv2.addWeighted(img, 0.45, output, 0.55, 0)
    gaussian = cv2.GaussianBlur(blended, (0, 0), 2.0)
    sharpened = cv2.addWeighted(blended, 1.5, gaussian, -0.5, 0)
    final_output = cv2.fastNlMeansDenoisingColored(sharpened, None, 2, 2, 7, 21)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, final_output)

    print('=' * 50)
    print('GFPGAN Enhancement Completed!')
    print(f'Saved As: {output_path}')
    print('=' * 50)


if __name__ == '__main__':
    args = parse_args()
    run_gfpgan(
        args.input,
        args.output,
        args.weight,
        args.upscale,
        args.arch,
        args.channel_multiplier
    )
