import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);  // Clear error when a new file is selected
    setSuccess(null); // Clear success message when a new file is selected
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!file) {
      setError('No file selected');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Successful file upload
      setSuccess(response.data.message);
      setFile(null);
    } catch (error) {
      setError(error.response ? error.response.data.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <h2>File Upload</h2>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <input
        type="file"
        accept=".pdf, .jpg, .png, .jpeg"
        onChange={handleFileChange}
      />
      <button
        onClick={handleFileUpload}
        disabled={loading}
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>

      {file && <p>Selected file: {file.name}</p>}
    </div>
  );
};

export default FileUpload;
