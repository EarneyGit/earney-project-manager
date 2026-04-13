import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Company } from "@/types/company";
import * as api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  isLoadingCompanies: boolean;
  setActiveCompany: (company: Company) => void;
  createCompany: (data: Partial<Company>) => Promise<Company>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const ACTIVE_COMPANY_KEY = "earney_active_company_id";

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  const loadCompanies = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoadingCompanies(false);
      return;
    }
    setIsLoadingCompanies(true);
    try {
      const data = await api.fetchCompanies();
      setCompanies(data);

      // Restore active company from localStorage
      const savedId = localStorage.getItem(ACTIVE_COMPANY_KEY);
      const saved = data.find((c) => c.id === savedId);
      if (saved) {
        setActiveCompanyState(saved);
      } else if (data.length > 0) {
        setActiveCompanyState(data[0]);
        localStorage.setItem(ACTIVE_COMPANY_KEY, data[0].id);
      }
    } catch (e) {
      console.error("loadCompanies error:", e);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) loadCompanies();
  }, [authLoading, loadCompanies]);

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company);
    localStorage.setItem(ACTIVE_COMPANY_KEY, company.id);
  };

  const createCompany = async (data: Partial<Company>): Promise<Company> => {
    const newCompany = await api.createCompany(data);
    setCompanies((prev) => [...prev, newCompany]);
    // Auto-select if first company
    if (companies.length === 0) setActiveCompany(newCompany);
    return newCompany;
  };

  const updateCompany = async (id: string, data: Partial<Company>) => {
    const updated = await api.updateCompany(id, data);
    setCompanies((prev) => prev.map((c) => (c.id === id ? updated : c)));
    if (activeCompany?.id === id) setActiveCompanyState(updated);
  };

  const deleteCompany = async (id: string) => {
    await api.deleteCompany(id);
    const remaining = companies.filter((c) => c.id !== id);
    setCompanies(remaining);
    if (activeCompany?.id === id) {
      const next = remaining[0] || null;
      setActiveCompanyState(next);
      if (next) localStorage.setItem(ACTIVE_COMPANY_KEY, next.id);
      else localStorage.removeItem(ACTIVE_COMPANY_KEY);
    }
  };

  const refreshCompanies = () => loadCompanies();

  return (
    <CompanyContext.Provider value={{
      companies,
      activeCompany,
      isLoadingCompanies,
      setActiveCompany,
      createCompany,
      updateCompany,
      deleteCompany,
      refreshCompanies,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
};
