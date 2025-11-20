import React, { createContext, useContext } from 'react';

type CardContextType = {};
const CardContext = createContext<CardContextType | undefined>(undefined);

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardRoot: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <CardContext.Provider value={{}}>
      <div
        className={`rounded-xl border border-slate-700 bg-slate-800 text-white shadow-lg ${className}`}
        {...props}
      >
        {children}
      </div>
    </CardContext.Provider>
  );
};

const Header: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={`p-6 flex flex-col space-y-1.5 ${className}`} {...props} />
);
Header.displayName = 'Card.Header';

const Title: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight text-slate-100 ${className}`} {...props} />
);
Title.displayName = 'Card.Title';

const Content: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);
Content.displayName = 'Card.Content';

export const Card = Object.assign(CardRoot, { Header, Title, Content });
