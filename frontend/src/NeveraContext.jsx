import { createContext, useContext } from 'react';

export const NeveraContext = createContext(null);
export const useNevera = () => useContext(NeveraContext);