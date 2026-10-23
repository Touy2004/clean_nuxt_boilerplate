#!/usr/bin/env node
// scripts/make-feature.mjs
import fs from "node:fs";
import path from "node:path";

const rawName = process.argv[2];

if (!rawName) {
  console.error("❌ Please provide a feature name!");
  console.log("👉 Usage: yarn make:feature <feature-name>");
  console.log("👉 Example: yarn make:feature product-category");
  process.exit(1);
}

const toKebabCase = (str) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const toPascalCase = (str) =>
  toKebabCase(str)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

const toCamelCase = (str) => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const kebab = toKebabCase(rawName);
const Pascal = toPascalCase(rawName);
const camel = toCamelCase(rawName);

const BASE_DIR = fs.existsSync(path.resolve("source")) ? "source" : ".";

// ==========================================
// 1. FEATURE LAYER TEMPLATES
// ==========================================

const domainTemplate = `// domain/models/${kebab}.model.ts
export type ${Pascal}Status = "A" | "I";

export interface ${Pascal}Model {
  id: number | string;
  code: string;
  titleLo: string;
  titleEn: string;
  isActive: boolean;
  statusTag: ${Pascal}Status;
}

export interface ${Pascal}Filter {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}
`;

const dtoTemplate = `// data/dtos/${kebab}.dto.ts
export interface Save${Pascal}ReqDTO {
  id?: string | number;
  titleLo: string;
  titleEn: string;
  status?: string;
}

export interface ${Pascal}RespDTO {
  id: number;
  code?: string | null;
  titleLo?: string | null;
  titleEn?: string | null;
  status?: string | null;
  createdAt?: string;
}
`;

const mapperTemplate = `// data/mappers/${kebab}.mapper.ts
import type { ${Pascal}RespDTO } from "@/data/dtos/${kebab}.dto";
import type { ${Pascal}Model } from "@/domain/models/${kebab}.model";

export const ${camel}Mapper = {
  toDomain(dto: ${Pascal}RespDTO):${Pascal}Model {
    return {
      id: dto.id,
      code: dto.code || "-",
      titleLo: dto.titleLo || "-",
      titleEn: dto.titleEn || "-",
      isActive: dto.status === "A",
      statusTag: dto.status === "A" ? "A" : "I",
    };
  },

  toDomainList(dtos?: ${Pascal}RespDTO[] \vert{} null):${Pascal}Model[] {
    if (!Array.isArray(dtos)) return [];
    return dtos.map((item) => this.toDomain(item));
  },
};
`;

const repoTemplate = `// data/repositories/${kebab}.repo.ts
import { apiRequest, toFormData } from "@/core/network/apiClient";
import { ${camel}Mapper } from "@/data/mappers/${kebab}.mapper";
import type { ${Pascal}RespDTO, Save${Pascal}ReqDTO } from "@/data/dtos/${kebab}.dto";
import type { ${Pascal}Filter, ${Pascal}Model } from "@/domain/models/${kebab}.model";
import type { CommonResponseData } from "@/core/types/api.types";

export const ${camel}Repository = {
  async getList(query?: ${Pascal}Filter): Promise<${Pascal}Model[]> {
    const { data } = await apiRequest<${Pascal}RespDTO[]>("/${kebab}/list", {
      method: "GET",
      query,
    });
    return ${camel}Mapper.toDomainList(data);
  },

  async save(body: Save${Pascal}ReqDTO) {
    const { data } = await apiRequest<CommonResponseData>("/${kebab}/save", {
      method: "POST",
      body: toFormData(body),
    });
    return data;
  },

  async delete(id: string | number) {
    const { data } = await apiRequest<CommonResponseData>(\`/${kebab}/delete/\${id}\`, {
      method: "DELETE",
    });
    return data;
  },
};
`;

const storeTemplate = `// stores/${kebab}.store.ts
import { defineStore } from "pinia";
import { ${camel}Repository } from "@/data/repositories/${kebab}.repo";
import type { ${Pascal}Filter, ${Pascal}Model } from "@/domain/models/${kebab}.model";
import type { Save${Pascal}ReqDTO } from "@/data/dtos/${kebab}.dto";

export const use${Pascal}Store = defineStore("${camel}", () => {
  const dialog = useDialog();

  const loading = ref(false);
  const filter = ref<${Pascal}Filter>({ q: "", status: "" });
  const items = ref<${Pascal}Model[]>([]);

  const fetchList = async () => {
    loading.value = true;
    try {
      const result = await dialog.catchError(() =>
        ${camel}Repository.getList(filter.value)
      );
      items.value = result ?? [];
    } finally {
      loading.value = false;
    }
  };

  const saveItem = async (payload: Save${Pascal}ReqDTO) => {
    loading.value = true;
    try {
      const res = await dialog.catchError(() =>
        ${camel}Repository.save(payload)
      );
      if (res) {
        await dialog.success("Success", "${Pascal} saved successfully");
        await fetchList();
      }
      return res;
    } finally {
      loading.value = false;
    }
  };

  const deleteItem = async (id: string | number) => {
    loading.value = true;
    try {
      const res = await dialog.catchError(() =>
        ${camel}Repository.delete(id)
      );
      if (res) {
        await dialog.success("Success", "${Pascal} deleted successfully");
        await fetchList();
      }
      return res;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    filter,
    items,
    fetchList,
    saveItem,
    deleteItem,
  };
});
`;

// ==========================================
// 2. UNIT TEST TEMPLATES (Vitest)
// ==========================================

const mapperSpecTemplate = `// tests/unit/${kebab}/${kebab}.mapper.spec.ts
import { describe, it, expect } from "vitest";
import { ${camel}Mapper } from "@/data/mappers/${kebab}.mapper";
import type { ${Pascal}RespDTO } from "@/data/dtos/${kebab}.dto";

describe("${camel}Mapper", () => {
  it("transforms valid DTO into clean Domain Model", () => {
    const rawDto: ${Pascal}RespDTO = {
      id: 1,
      code: "CODE-01",
      titleLo: "ຊື່ພາສາລາວ",
      titleEn: "English Title",
      status: "A",
    };

    const result = ${camel}Mapper.toDomain(rawDto);

    expect(result).toEqual({
      id: 1,
      code: "CODE-01",
      titleLo: "ຊື່ພາສາລາວ",
      titleEn: "English Title",
      isActive: true,
      statusTag: "A",
    });
  });

  it("applies default '-' fallbacks for null/undefined fields", () => {
    const rawDto: ${Pascal}RespDTO = {
      id: 2,
      code: null,
      titleLo: undefined,
      titleEn: "",
      status: "I",
    };

    const result = ${camel}Mapper.toDomain(rawDto);

    expect(result.code).toBe("-");
    expect(result.titleLo).toBe("-");
    expect(result.titleEn).toBe("-");
    expect(result.isActive).toBe(false);
    expect(result.statusTag).toBe("I");
  });

  it("returns empty array when toDomainList receives null or undefined", () => {
    expect(${camel}Mapper.toDomainList(null)).toEqual([]);
    expect(${camel}Mapper.toDomainList(undefined)).toEqual([]);
  });
});
`;

const repoSpecTemplate = `// tests/unit/${kebab}/${kebab}.repo.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ${camel}Repository } from "@/data/repositories/${kebab}.repo";
import * as apiClient from "@/core/network/apiClient";

vi.mock("@/core/network/apiClient", () => ({
  apiRequest: vi.fn(),
  toFormData: vi.fn((body) => body),
}));

describe("${camel}Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getList calls apiRequest and returns mapped Domain Models", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      code: "00",
      desc: "Success",
      data: [{ id: 1, code: "C01", titleLo: "ລາວ", titleEn: "EN", status: "A" }],
    });

    const result = await ${camel}Repository.getList({ q: "test" });

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/${kebab}/list", {
      method: "GET",
      query: { q: "test" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
  });

  it("save serializes payload with toFormData and posts to /${kebab}/save", async () => {
    const payload = { titleLo: "ລາວ", titleEn: "EN", status: "A" };
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      code: "00",
      desc: "Saved",
      data: { code: "00", desc: "Saved" },
    });

    await ${camel}Repository.save(payload);

    expect(apiClient.toFormData).toHaveBeenCalledWith(payload);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/${kebab}/save", {
      method: "POST",
      body: payload,
    });
  });
});
`;

const storeSpecTemplate = `// tests/unit/${kebab}/${kebab}.store.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { use${Pascal}Store } from "@/stores/${kebab}.store";
import { ${camel}Repository } from "@/data/repositories/${kebab}.repo";

const mockSuccess = vi.fn();
const mockCatchError = vi.fn((fn) => fn());

vi.stubGlobal("useDialog", () => ({
  catchError: mockCatchError,
  success: mockSuccess,
}));

vi.mock("@/data/repositories/${kebab}.repo", () => ({
  ${camel}Repository: {
    getList: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("use${Pascal}Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("fetchList populates items state and toggles loading", async () => {
    const mockItems = [
      { id: 1, code: "C01", titleLo: "ລາວ", titleEn: "EN", isActive: true, statusTag: "A" as const },
    ];
    vi.mocked(${camel}Repository.getList).mockResolvedValueOnce(mockItems);

    const store = use${Pascal}Store();
    await store.fetchList();

    expect(mockCatchError).toHaveBeenCalled();
    expect(store.items).toEqual(mockItems);
    expect(store.loading).toBe(false);
  });

  it("saveItem triggers success dialog and refreshes list when successful", async () => {
    vi.mocked(${camel}Repository.save).mockResolvedValueOnce({ code: "00", desc: "OK" } as any);
    vi.mocked(${camel}Repository.getList).mockResolvedValueOnce([]);

    const store = use${Pascal}Store();
    await store.saveItem({ titleLo: "ລາວ", titleEn: "EN" });

    expect(${camel}Repository.save).toHaveBeenCalledWith({ titleLo: "ລາວ", titleEn: "EN" });
    expect(mockSuccess).toHaveBeenCalledWith("Success", "${Pascal} saved successfully");
    expect(${camel}Repository.getList).toHaveBeenCalled();
  });
});
`;

// ==========================================
// 3. WRITE FILES TO DISK
// ==========================================

const filesToCreate = [
  // Feature Files
  { relPath: `domain/models/${kebab}.model.ts`, content: domainTemplate },
  { relPath: `data/dtos/${kebab}.dto.ts`, content: dtoTemplate }, { relPath: `data/mappers/${kebab}.mapper.ts`, content: mapperTemplate },
  { relPath: `data/repositories/${kebab}.repo.ts`, content: repoTemplate }, { relPath: `stores/${kebab}.store.ts`, content: storeTemplate },
  // Unit Test Files
  { relPath: `tests/unit/${kebab}/${kebab}.mapper.spec.ts`, content: mapperSpecTemplate },
  { relPath: `tests/unit/${kebab}/${kebab}.repo.spec.ts`, content: repoSpecTemplate },
  { relPath: `tests/unit/${kebab}/${kebab}.store.spec.ts`, content: storeSpecTemplate },
];

console.log(`\n🚀 Scaffolding Clean Architecture feature + Unit Tests: "${Pascal}"...\n`);

for (const file of filesToCreate) {
  const fullPath = path.resolve(BASE_DIR, file.relPath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(fullPath)) {
    console.warn(`⚠️  Skipped (already exists): ${file.relPath}`); } else { fs.writeFileSync(fullPath, file.content, "utf8"); console.log(`✅ Created: ${file.relPath}`);
  }
}

console.log(`\n🎉 Done! Run \`yarn test\` to execute the unit tests for "${kebab}".\n`);