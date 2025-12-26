import React from 'react';

const FormSelect = ({ label, value, options, onChange }) => (
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '13px',
        background: 'white',
        cursor: 'pointer'
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export default FormSelect;