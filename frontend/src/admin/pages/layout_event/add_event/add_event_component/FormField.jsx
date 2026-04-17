import React from 'react';

const FormField = ({ label, value, onChange, type = 'text', readOnly, placeholder, multiline }) => (
  <div>
    <label style={{
      display: 'block',
      marginBottom: '5px',
      fontSize: '12px',
      fontWeight: 600,
      color: '#555'
    }}>
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '13px',
          fontFamily: 'inherit',
          minHeight: '60px',
          resize: 'vertical'
        }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '13px',
          background: readOnly ? '#f5f5f5' : 'white'
        }}
      />
    )}
  </div>
);

export default FormField;