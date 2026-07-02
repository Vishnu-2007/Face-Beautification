import argparse
import os
import cv2

from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet


def parse_args():
    parser = argparse.ArgumentParser(description='Run Real-ESRGAN upscaling')
    parser.add_argument('--input', required=True, help='Input image path')
    parser.add_argument('--output', required=True, help='Output image path')
    parser.add_argument('--weight', default='../weights/RealESRGAN_x4plus.pth', help='Real-ESRGAN weight path relative to script dir')
    parser.add_argument('--scale', type=int, default=4, help='Model scale')
    parser.add_argument('--outscale', type=int, default=2, help='Output scale factor')
    parser.add_argument('--tile', type=int, default=0, help='Tile size')
    parser.add_argument('--tile_pad', type=int, default=10, help='Tile padding')
    parser.add_argument('--pre_pad', type=int, default=0, help='Pre-pad')
    parser.add_argument('--half', action='store_true', help='Use half precision')
    return parser.parse_args()


def run_realesrgan(input_path, output_path, weight_path, scale=4, outscale=2, tile=0, tile_pad=10, pre_pad=0, half=False):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if not os.path.isabs(weight_path):
        weight_path = os.path.join(script_dir, weight_path)

    model = RRDBNet(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_block=23,
        num_grow_ch=32,
        scale=scale
    )

    upsampler = RealESRGANer(
        scale=scale,
        model_path=weight_path,
        model=model,
        tile=tile,
        tile_pad=tile_pad,
        pre_pad=pre_pad,
        half=half
    )

    img = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f'Input image not found: {input_path}')

    output, _ = upsampler.enhance(img, outscale=outscale)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, output)

    print('=' * 50)
    print('Real-ESRGAN Upscaling Completed!')
    print(f'Saved As: {output_path}')
    print('=' * 50)


if __name__ == '__main__':
    args = parse_args()
    run_realesrgan(
        args.input,
        args.output,
        args.weight,
        args.scale,
        args.outscale,
        args.tile,
        args.tile_pad,
        args.pre_pad,
        args.half
    )
