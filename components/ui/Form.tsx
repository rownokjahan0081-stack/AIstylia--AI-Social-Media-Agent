import React from 'react';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
    <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
    <textarea {...props} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none" />
  </div>
);

export const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, description: string }> = ({ label, description, ...props }) => (
    <div className="flex items-start rounded-md p-4 bg-slate-700/50 border border-slate-700">
        <input type="checkbox" {...props} className="h-5 w-5 rounded mt-1 text-sky-500 bg-slate-600 border-slate-500 focus:ring-sky-500" />
        <div className="ml-3 text-sm">
            <label className="font-medium text-white">{label}</label>
            <p className="text-slate-400">{description}</p>
        </div>
    </div>
);
