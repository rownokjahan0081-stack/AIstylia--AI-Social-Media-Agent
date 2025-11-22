import React from 'react';

interface TabsProps {
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ children, className }) => {
  return (
    <div className={`flex items-center border-b border-slate-200 ${className}`}>
      {children}
    </div>
  );
};

interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isActive: boolean;
}

export const Tab: React.FC<TabProps> = ({ children, isActive, className, ...props }) => {
  return (
    <button
      className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors duration-200
        ${
          isActive
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};