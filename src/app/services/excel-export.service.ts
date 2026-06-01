import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {
  constructor() {}

  /**
   * Exporta un arreglo de objetos JSON a un archivo Excel (.xlsx)
   * @param json Arreglo de datos
   * @param excelFileName Nombre del archivo a descargar (sin extensión)
   */
  public exportAsExcelFile(json: any[], excelFileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
    const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    
    // Configurar el ancho de las columnas basándose en el contenido y las cabeceras
    if (json.length > 0) {
        const objectMaxLength: number[] = [];
        const keys = Object.keys(json[0]);
        for (let i = 0; i < keys.length; i++) {
            objectMaxLength[i] = keys[i].length;
        }
        json.forEach(obj => {
            keys.forEach((key, i) => {
                const value = obj[key] ? obj[key].toString() : '';
                objectMaxLength[i] = Math.max(objectMaxLength[i], value.length);
            });
        });
        worksheet['!cols'] = objectMaxLength.map(w => ({ width: w + 2 })); // Margen extra
    }

    XLSX.writeFile(workbook, `${excelFileName}_${new Date().getTime()}.xlsx`);
  }
}
