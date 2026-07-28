import readXlsxFile from "read-excel-file/browser";
import type { HerbalifePePriceRow } from "@/data/herbalife-pe-price-list";

type Cell = string | number | boolean | Date | null;

const aliases: Record<keyof Omit<HerbalifePePriceRow, "source_name" | "source_url">, string[]> = {
  sku: ["sku", "codigo", "código"],
  name: ["produto", "nome", "name"],
  volume_points: ["pv", "pontos", "pontos de volume"],
  gross_price: ["bruto", "valor bruto", "preco bruto", "preço bruto"],
  earnings_base: ["base de ganhos", "earnings base", "base"],
  price_25: ["25", "25%", "preco 25", "preço 25"],
  price_35: ["35", "35%", "preco 35", "preço 35"],
  price_42: ["42", "42%", "preco 42", "preço 42"],
  price_50: ["50", "50%", "preco 50", "preço 50"],
  reference_date: ["data", "data de referencia", "data de referência", "reference date"],
};

function normalized(value: Cell) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function numeric(value: Cell, label: string, line: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "")
    .replace(/\s|R\$/gi, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Linha ${line}: valor inválido em “${label}”.`);
  return parsed;
}

function parseCsv(content: string) {
  const delimiter =
    (content.split(/\r?\n/, 1)[0].match(/;/g) ?? []).length >
    (content.split(/\r?\n/, 1)[0].match(/,/g) ?? []).length
      ? ";"
      : ",";
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => String(cell).trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => String(cell).trim())) rows.push(row);
  return rows;
}

function findColumn(headers: Cell[], field: keyof typeof aliases) {
  const options = aliases[field].map(normalized);
  return headers.findIndex((header) => options.includes(normalized(header)));
}

function rowsToProducts(
  rows: Cell[][],
  sourceName: string,
  sourceUrl: string,
  fallbackReferenceDate: string,
) {
  if (rows.length < 2) throw new Error("A planilha não possui produtos para importar.");
  const headers = rows[0];
  const indexes = Object.fromEntries(
    (Object.keys(aliases) as Array<keyof typeof aliases>).map((field) => [
      field,
      findColumn(headers, field),
    ]),
  ) as Record<keyof typeof aliases, number>;
  const required: Array<keyof typeof aliases> = [
    "sku",
    "name",
    "volume_points",
    "gross_price",
    "earnings_base",
    "price_25",
    "price_35",
    "price_42",
    "price_50",
  ];
  const missing = required.filter((field) => indexes[field] < 0);
  if (missing.length) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${missing.map((field) => aliases[field][0]).join(", ")}.`,
    );
  }

  const seen = new Set<string>();
  return rows.slice(1).map((row, index): HerbalifePePriceRow => {
    const line = index + 2;
    const sku = String(row[indexes.sku] ?? "")
      .trim()
      .toUpperCase();
    const name = String(row[indexes.name] ?? "").trim();
    if (!sku || !name) throw new Error(`Linha ${line}: informe SKU e nome do produto.`);
    if (seen.has(sku)) throw new Error(`Linha ${line}: SKU ${sku} está duplicado no arquivo.`);
    seen.add(sku);
    const referenceCell = indexes.reference_date >= 0 ? row[indexes.reference_date] : null;
    const referenceDate =
      referenceCell instanceof Date
        ? referenceCell.toISOString().slice(0, 10)
        : String(referenceCell ?? fallbackReferenceDate).trim() || fallbackReferenceDate;
    return {
      sku,
      name,
      volume_points: numeric(row[indexes.volume_points], "PV", line),
      gross_price: numeric(row[indexes.gross_price], "valor bruto", line),
      earnings_base: numeric(row[indexes.earnings_base], "base de ganhos", line),
      price_25: numeric(row[indexes.price_25], "25%", line),
      price_35: numeric(row[indexes.price_35], "35%", line),
      price_42: numeric(row[indexes.price_42], "42%", line),
      price_50: numeric(row[indexes.price_50], "50%", line),
      source_name: sourceName,
      source_url: sourceUrl,
      reference_date: referenceDate,
    };
  });
}

export async function parseProductImportFile(file: File, referenceDate: string) {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  let rows: Cell[][];
  if (extension === "xlsx") {
    const sheets = await readXlsxFile(file);
    rows = (sheets[0]?.data ?? []) as Cell[][];
  } else if (extension === "csv") {
    rows = parseCsv(await file.text());
  } else {
    throw new Error("Use um arquivo CSV ou XLSX.");
  }
  return rowsToProducts(rows, file.name, "", referenceDate);
}
