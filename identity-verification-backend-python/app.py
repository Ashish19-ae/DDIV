import os
import hashlib
import pytesseract
from PIL import Image, ExifTags
from flask import Flask, request, jsonify

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Function to calculate file hash
def get_file_hash(file_path):
    hasher = hashlib.sha256()
    with open(file_path, 'rb') as f:
        hasher.update(f.read())
    return hasher.hexdigest()

# Function to extract metadata
def extract_metadata(file_path):
    try:
        image = Image.open(file_path)
        exif_data = image._getexif()
        metadata = {}
        if exif_data:
            for tag, value in exif_data.items():
                tag_name = ExifTags.TAGS.get(tag, tag)
                metadata[tag_name] = value
        return metadata
    except Exception as e:
        return {"error": str(e)}

# Function to perform OCR
def extract_text(file_path):
    try:
        text = pytesseract.image_to_string(Image.open(file_path))
        return text
    except Exception as e:
        return "OCR Failed"

# File Upload API
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'document' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['document']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    # Step 1: Generate File Hash
    file_hash = get_file_hash(file_path)

    # Step 2: Extract Metadata
    metadata = extract_metadata(file_path)

    # Step 3: Perform OCR to Extract Text
    extracted_text = extract_text(file_path)

    # Step 4: Fraud Detection Logic
    fraud_detected = False
    fraud_reason = ""

    if "Photoshop" in str(metadata):  # Check if document was edited
        fraud_detected = True
        fraud_reason = "Document edited with Photoshop"

    if len(extracted_text) < 10:  # Too little text = Suspicious
        fraud_detected = True
        fraud_reason = "Suspicious document with very little text"

    # Step 5: Return Response
    if fraud_detected:
        os.remove(file_path)  # Delete the file if fraud is detected
        return jsonify({"error": "Fraud detected", "reason": fraud_reason}), 400

    return jsonify({
        "message": "File uploaded successfully!",
        "file_hash": file_hash,
        "metadata": metadata,
        "extracted_text": extracted_text
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
