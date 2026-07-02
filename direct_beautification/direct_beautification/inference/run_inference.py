import argparse
import os
import sys

from PIL import Image
import torch
from torchvision import transforms
from torchvision.utils import save_image

# Ensure the parent project directory is on the import path so models can be imported
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
sys.path.insert(0, PROJECT_ROOT)

from models.generator import Generator


def parse_args():
    parser = argparse.ArgumentParser(description='Run direct beautification inference')
    parser.add_argument('--input', required=True, help='Input image path')
    parser.add_argument('--output', required=True, help='Output image path')
    parser.add_argument('--intensity', type=float, default=0.85, help='Beautification intensity')
    parser.add_argument('--checkpoint', default='checkpoints_ssim/generator_epoch_100.pth', help='SSIM checkpoint path relative to direct_beautification root')
    parser.add_argument('--device', default=None, help='Device to run on: cuda or cpu')
    return parser.parse_args()


def main():
    args = parse_args()

    device_name = args.device or ('cuda' if torch.cuda.is_available() else 'cpu')
    device = torch.device(device_name)

    checkpoint_path = args.checkpoint
    if not os.path.isabs(checkpoint_path):
        checkpoint_path = os.path.join(PROJECT_ROOT, checkpoint_path)

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f'Checkpoint not found: {checkpoint_path}')

    model = Generator().to(device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model.eval()

    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    ])

    input_image = Image.open(args.input).convert('RGB')
    input_tensor = transform(input_image).unsqueeze(0).to(device)

    intensity = max(0.0, min(1.0, args.intensity))

    with torch.no_grad():
        output = model(input_tensor, intensity=intensity)

    save_image((output + 1) / 2, args.output)


if __name__ == '__main__':
    main()
