"""Download the OpenCV face models used by app.py into ./models (run once)."""

import urllib.request
from pathlib import Path

MODELS = {
    "face_detection_yunet_2023mar.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    "lbfmodel.yaml": "https://raw.githubusercontent.com/kurnianggoro/GSOC2017/master/data/lbfmodel.yaml",
}

if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "models"
    out.mkdir(exist_ok=True)
    for name, url in MODELS.items():
        target = out / name
        if target.exists() and target.stat().st_size > 0:
            print(f"✓ {name} already present")
            continue
        print(f"↓ {name} ...")
        urllib.request.urlretrieve(url, target)
        print(f"✓ {name} ({target.stat().st_size / 1e6:.1f} MB)")
