import type ExcelJS from "exceljs";

const textValue = (cell:ExcelJS.Cell):string|null => {
  const value=cell.result ?? cell.value;
  return typeof value==="string"?value:typeof value==="object"&&value&&"richText" in value&&Array.isArray(value.richText)?value.richText.map((part:{text:string})=>part.text).join(""):null;
};
/** Fit visible report text without shrinking fonts or changing calculations.
 * The detailed nutrient matrices remain several pages wide; they must never be
 * squeezed, with 160 nutrients, into a single unreadable A4 page.
 */
export function finalizeNutritionWorkbookLayout(workbook:ExcelJS.Workbook){
  for(const sheet of workbook.worksheets){
    if(sheet.state!=="visible")continue;
    sheet.views=sheet.views.map(view=>({...view,showGridLines:false}));
    sheet.pageSetup.margins={left:0.45,right:0.45,top:0.5,bottom:0.5,header:0.2,footer:0.2};
    if(sheet.columnCount<=12){sheet.pageSetup.fitToPage=true;sheet.pageSetup.fitToWidth=1;sheet.pageSetup.fitToHeight=0;}
    else{sheet.pageSetup.fitToPage=false;sheet.pageSetup.scale=90;sheet.pageSetup.printTitlesColumn=sheet.name==="Phan tich chi tiet"?"A:D":"A:B";}
    if(["Thuc don","Bao cao"].includes(sheet.name))sheet.properties.tabColor={argb:"123C36"};
    if(sheet.name==="Du lieu")continue;
    sheet.eachRow(row=>{
      let required=row.height??24;
      row.eachCell(cell=>{
        cell.font={...cell.font,name:"Times New Roman"};
        if(cell.isMerged&&cell.master.address!==cell.address)return;
        const value=cell.result??cell.value;
        if(typeof value==="number"){cell.alignment={...cell.alignment,horizontal:"right",vertical:"middle",wrapText:false,indent:1};return;}
        const text=textValue(cell);if(!text||!cell.alignment?.wrapText)return;
        let width=sheet.getColumn(Number(cell.col)).width??12;
        if(cell.isMerged)for(let column=Number(cell.col)+1;column<=sheet.columnCount;column++){const next=sheet.getCell(Number(cell.row),column);if(!next.isMerged||next.master.address!==cell.address)break;width+=sheet.getColumn(column).width??12;}
        const size=cell.font.size??12,capacity=Math.max(4,width*11/size*0.95);
        const lines=text.split("\n").reduce((count,paragraph)=>count+Math.max(1,Math.ceil(Array.from(paragraph).length/capacity)),0);
        required=Math.max(required,lines*size*1.35+8);
        cell.alignment={...cell.alignment,vertical:"middle",shrinkToFit:false};
      });
      row.height=Math.min(409,required);
    });
  }
}
