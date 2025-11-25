import React from 'react';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }> = ({ label, description, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input {...props} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-transparent focus:outline-none placeholder:text-slate-400" />
    {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <textarea {...props} rows={3} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-transparent focus:outline-none resize-none placeholder:text-slate-400" />
  </div>
);

export const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, description: string }> = ({ label, description, ...props }) => (
    <div className="flex items-start rounded-md p-4 bg-slate-50 border border-slate-200">
        <input type="checkbox" {...props} className="h-5 w-5 rounded mt-1 text-indigo-600 bg-white border-slate-300 focus:ring-indigo-600" />
        <div className="ml-3 text-sm">
            <label className="font-medium text-slate-900">{label}</label>
            <p className="text-slate-500">{description}</p>
        </div>
    </div>
);
