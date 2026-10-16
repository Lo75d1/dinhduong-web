import JSZip from "jszip";

export type WorkbookChart = {
  title: string;
  categoryFormula: string;
  valueFormula: string;
  color: string;
  fromRow: number;
  fromColumn: number;
  toRow: number;
  toColumn: number;
  kind?: "bar" | "pie";
  categories?: string[];
  values?: Array<number | null>;
};

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

/** ExcelJS does not write charts. Add standard OOXML charts with live formula references. */
export async function addNativeWorkbookCharts(bytes: Uint8Array, sheetIndex: number, charts: WorkbookChart[], definedNames: Record<string, string> = {}): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(bytes);
  const sheetPath = `xl/worksheets/sheet${sheetIndex}.xml`;
  const worksheet = await zip.file(sheetPath)!.async("string");
  const drawing = `nutritionDrawing${sheetIndex}`;
  const relationships = `${XML}<Relationships xmlns="${REL_NS}">${charts.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/nutritionChart${sheetIndex}_${i + 1}.xml"/>`).join("")}</Relationships>`;
  const anchors = charts.map((chart, i) => `<xdr:twoCellAnchor><xdr:from><xdr:col>${chart.fromColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${chart.toColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="${escape(chart.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join("");
  zip.file(`xl/drawings/${drawing}.xml`, `${XML}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`);
  zip.file(`xl/drawings/_rels/${drawing}.xml.rels`, relationships);
  const relPath = `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`;
  const oldRels = zip.file(relPath) ? await zip.file(relPath)!.async("string") : `${XML}<Relationships xmlns="${REL_NS}"></Relationships>`;
  zip.file(relPath, oldRels.replace("</Relationships>", `<Relationship Id="nutritionChartDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/${drawing}.xml"/></Relationships>`));
  zip.file(sheetPath, worksheet.replace("</worksheet>", '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="nutritionChartDrawing"/></worksheet>'));
  let contentTypes = await zip.file("[Content_Types].xml")!.async("string");
  const overrides = [`<Override PartName="/xl/drawings/${drawing}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`];
  charts.forEach((chart, i) => {
    const axes = chart.kind === "pie" ? "" : '<c:axId val="621"/><c:axId val="622"/>';
    const plot = chart.kind === "pie" ? "pieChart" : "barChart";
    const chartOptions = chart.kind === "pie" ? "" : '<c:barDir val="col"/><c:grouping val="clustered"/>';
    const axisXml = chart.kind === "pie" ? "" : '<c:catAx><c:axId val="621"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:solidFill><a:srgbClr val="B9CAC2"/></a:solidFill></a:ln></c:spPr><c:crossAx val="622"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="622"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="621"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>';
    const categoryCache = chart.categories ? `<c:strCache><c:ptCount val="${chart.categories.length}"/>${chart.categories.map((value, index) => `<c:pt idx="${index}"><c:v>${escape(value)}</c:v></c:pt>`).join("")}</c:strCache>` : "";
    const valueCache = chart.values ? `<c:numCache><c:formatCode>${chart.kind === "pie" ? "0.0%" : "0.0"}</c:formatCode><c:ptCount val="${chart.values.length}"/>${chart.values.map((value, index) => value === null ? "" : `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>`).join("")}</c:numCache>` : "";
    const seriesStyle = chart.kind === "pie" ? ["123C36", "BC9A42", "6794A6"].map((color, index) => `<c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join("") : `<c:spPr><a:solidFill><a:srgbClr val="${chart.color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>`;
    const labels = chart.kind === "pie" ? '<c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/></c:dLbls>' : '<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls>';
    const chartXml = `${XML}<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:lang val="vi-VN"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="vi-VN" sz="1200"/><a:t>${escape(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:${plot}>${chartOptions}<c:varyColors val="${chart.kind === "pie" ? 1 : 0}"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${escape(chart.title)}</c:v></c:tx>${seriesStyle}<c:cat><c:strRef><c:f>${escape(chart.categoryFormula)}</c:f>${categoryCache}</c:strRef></c:cat><c:val><c:numRef><c:f>${escape(chart.valueFormula)}</c:f>${valueCache}</c:numRef></c:val></c:ser>${labels}${axes}</c:${plot}>${axisXml}</c:plotArea>${chart.kind === "pie" ? '<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>' : ""}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
    const path = `xl/charts/nutritionChart${sheetIndex}_${i + 1}.xml`;
    zip.file(path, chartXml);
    overrides.push(`<Override PartName="/${path}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
  });
  contentTypes = contentTypes.replace("</Types>", `${overrides.join("")}</Types>`);
  zip.file("[Content_Types].xml", contentTypes);
  if (Object.keys(definedNames).length) {
    const workbook = await zip.file("xl/workbook.xml")!.async("string");
    const names = Object.entries(definedNames).map(([name, expression]) => `<definedName name="${escape(name)}">${escape(expression)}</definedName>`).join("");
    zip.file("xl/workbook.xml", workbook.includes("</definedNames>") ? workbook.replace("</definedNames>", `${names}</definedNames>`) : workbook.replace("<calcPr", `<definedNames>${names}</definedNames><calcPr`));
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
