import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Circles } from 'react-loader-spinner';
import './App.css'; // Import a CSS file for styling

function App() {
  const [file, setFile] = useState(null);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage(''); // Clear any previous messages
  };

  // Handle file upload
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }
    if (!userId || !status) {
      setMessage('Please provide both User ID and Status.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('userId', userId);
    formData.append('status', status);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('File uploaded successfully!');
      console.log('Upload response:', response.data);
      setFile(null);
      setUserId('');
      setStatus('');
      fetchUploadedFiles(); // Refresh file list
    } catch (error) {
      setMessage('Error uploading document. Please try again.');
      console.error('Upload error:', error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch uploaded files
  const fetchUploadedFiles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/uploads');
      setUploadedFiles(response.data);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // Handle file deletion
  const handleDelete = async (filename) => {
    try {
      await axios.delete(`http://localhost:5000/uploads/${filename}`);
      fetchUploadedFiles(); // Refresh the file list
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Document Upload System</h1>
      </header>
      <main>
        <section className="upload-section">
          <h2>Upload Document</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="file">Choose File (PDF, JPG, PNG):</label>
              <input
                type="file"
                id="file"
                accept=".pdf,.jpg,.png"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="userId">User ID:</label>
              <input
                type="text"
                id="userId"
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="status">Status:</label>
              <input
                type="text"
                id="status"
                placeholder="Enter Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading} className="upload-button">
              {isLoading ? (
                <Circles height="20" width="20" color="#fff" ariaLabel="loading-indicator" />
              ) : (
                'Upload'
              )}
            </button>
          </form>
          {message && <p className={`message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</p>}
        </section>

        <section className="uploaded-files-section">
          <h2>Uploaded Files</h2>
          {uploadedFiles.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.map((file, index) => (
                  <tr key={index}>
                    <td>
                      <a
                        href={`http://localhost:5000/uploads/${file.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {file.filename}
                      </a>
                    </td>
                    <td>{file.size ? (file.size / 1024).toFixed(2) + ' KB' : 'Unknown'}</td>
                    <td>{file.uploadDate ? new Date(file.uploadDate).toLocaleString() : 'Unknown'}</td>
                    <td>
                      <button onClick={() => handleDelete(file.filename)} className="delete-button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No files uploaded yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;