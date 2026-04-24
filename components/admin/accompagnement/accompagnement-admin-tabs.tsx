"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductList } from "./product-list";
import { StudentProgressList } from "./student-progress-list";
import { TemplateList } from "./template-list";

export function AccompagnementAdminTabs() {
  const [activeSubTab, setActiveSubTab] = useState("products");

  return (
    <Tabs
      value={activeSubTab}
      onValueChange={setActiveSubTab}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="products">Produits</TabsTrigger>
        <TabsTrigger value="students">Suivi des étudiants</TabsTrigger>
        <TabsTrigger value="context-lines">Lignes de contexte</TabsTrigger>
      </TabsList>
      <TabsContent value="products" className="mt-4">
        <ProductList />
      </TabsContent>
      <TabsContent value="students" className="mt-4">
        <StudentProgressList />
      </TabsContent>
      <TabsContent value="context-lines" className="mt-4">
        <TemplateList />
      </TabsContent>
    </Tabs>
  );
}
