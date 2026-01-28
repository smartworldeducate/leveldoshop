// components/Loader.jsx
import React from 'react'

const Loader = () => {
  return (
    <div className="loader-overlay">
      <div className="loader">
        <div className="spinner"></div>
      </div>

      <style jsx>{`
        .loader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }
        .loader {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 6px solid #f3f3f3;
          border-top: 6px solid #0070f3; /* Primary color */
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Loader
