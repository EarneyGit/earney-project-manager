import React, { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Company } from "@/types/company";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CompanyDot({ name }: { name: string }) {
  const colors = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-6 h-6 rounded-md ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function CompanySwitcher() {
  const { companies, activeCompany, setActiveCompany } = useCompany();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-2 border-gray-200 hover:border-gray-400 max-w-[200px]"
        >
          {activeCompany ? (
            <>
              <CompanyDot name={activeCompany.name} />
              <span className="truncate text-sm font-medium">{activeCompany.name}</span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400 text-sm">Select company</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 text-gray-400 ml-auto flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-gray-400 uppercase tracking-wider">
          Switch Company
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400">No companies yet</div>
        ) : (
          companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => setActiveCompany(company)}
              className="gap-2 cursor-pointer"
            >
              <CompanyDot name={company.name} />
              <span className="flex-1 truncate">{company.name}</span>
              {activeCompany?.id === company.id && (
                <Check className="h-4 w-4 text-black flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/companies")}
          className="gap-2 cursor-pointer text-gray-600"
        >
          <Plus className="h-4 w-4" />
          Manage Companies
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
