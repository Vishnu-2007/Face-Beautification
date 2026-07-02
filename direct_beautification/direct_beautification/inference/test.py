import torch

from PIL import Image

from torchvision import transforms
from torchvision.utils import save_image

from models.generator import Generator

# ============================================
# DEVICE
# ============================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 50)
print("Using Device:", device)
print("=" * 50)

# ============================================
# LOAD MODEL
# ============================================

model = Generator().to(device)

model.load_state_dict(

    torch.load(
        "checkpoints/generator_epoch_100.pth",
        map_location=device
    )
)

model.eval()

print("Model Loaded Successfully!")

# ============================================
# IMAGE TRANSFORM
# ============================================

transform = transforms.Compose([

    transforms.Resize((256, 256)),

    transforms.ToTensor(),

    transforms.Normalize(
        (0.5, 0.5, 0.5),
        (0.5, 0.5, 0.5)
    )
])

# ============================================
# LOAD INPUT IMAGE
# ============================================

input_image = Image.open(
    "test3.jpeg"
).convert("RGB")

print("Input Image Loaded!")

input_tensor = transform(input_image)

input_tensor = input_tensor.unsqueeze(0).to(device)

# ============================================
# BEAUTIFICATION INTENSITY
# ============================================

intensity = 0.85

print(f"Beautification Intensity: {intensity}")

# ============================================
# GENERATE OUTPUT
# ============================================

with torch.no_grad():

    output = model(

        input_tensor,

        intensity=intensity
    )

print("Beautification Completed!")

# ============================================
# SAVE OUTPUT
# ============================================

save_image(

    (output + 1) / 2,

    "beautified_output.png"
)

print("=" * 50)
print("Output Saved Successfully!")
print("Saved As: beautified_output.png")
print("=" * 50)