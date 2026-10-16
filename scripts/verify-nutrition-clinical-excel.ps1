param([string]$EvidenceDirectory = (Join-Path $PSScriptRoot '../evidence/nutrition-chat'))
$ErrorActionPreference='Stop';$taskExcel=$null;$taskBook=$null;$taskChecks=0
function Check-Near($actual,[double]$expected,$label){if($null -eq $actual -or $actual -is [string] -or [Math]::Abs([double]$actual-$expected)-gt 0.000001){throw "$label : $actual"};$script:taskChecks++}
function Check-Text($actual,[string]$expected,$label){if($actual -ne $expected){throw "$label : $actual"};$script:taskChecks++}
try {
 $taskEvidence=[IO.Path]::GetFullPath($EvidenceDirectory)
 $taskExcel=New-Object -ComObject Excel.Application;$taskExcel.Visible=$false;$taskExcel.DisplayAlerts=$false;$taskExcel.AutomationSecurity=3
 $taskBook=$taskExcel.Workbooks.Open((Join-Path $taskEvidence 'clinical-test.xlsx'),0,$false);$taskExcel.CalculateFullRebuild()
 $taskReport=$taskBook.Worksheets.Item('Bao cao');$taskInput=$taskBook.Worksheets.Item('Nhap khau phan');$taskStart=0;$taskRows=@{}
 for($i=1;$i -le $taskReport.UsedRange.Rows.Count;$i++){if($taskReport.Cells.Item($i,1).Value2 -eq 'ĐỐI CHIẾU CHẾ ĐỘ ĂN BỆNH LÝ'){$taskStart=$i};if($taskStart -gt 0){$taskLabel=[string]$taskReport.Cells.Item($i,1).Value2;if($taskLabel -in @('Năng lượng','Natri','Kali')){$taskRows[$taskLabel]=$i}}}
 if($taskStart -eq 0){throw 'clinical section absent'};$taskChecks++
 $taskEnergy=$taskRows['Năng lượng'];$taskSodium=$taskRows['Natri'];$taskPotassium=$taskRows['Kali']
 Check-Near $taskReport.Cells.Item($taskEnergy,3).Value2 195 'clinical mean baseline'
 Check-Near $taskReport.Cells.Item($taskEnergy,4).Value2 100 'lower bound'
 Check-Near $taskReport.Cells.Item($taskEnergy,5).Value2 200 'upper bound'
 Check-Near $taskReport.Cells.Item($taskEnergy,6).Value2 2 'nonempty assessed days'
 Check-Near $taskReport.Cells.Item($taskEnergy,7).Value2 1 'within range days'
 Check-Text $taskReport.Cells.Item($taskEnergy,8).Value2 'Trong khoảng tham khảo' 'reference status'
 Check-Near $taskReport.Cells.Item($taskSodium,3).Value2 0 'real source zero'
 Check-Text $taskReport.Cells.Item($taskSodium,8).Value2 'Trong khoảng tham khảo' 'zero bound status'
 Check-Text $taskReport.Cells.Item($taskPotassium,3).Value2 '—' 'missing nutrient not zero'
 Check-Text $taskReport.Cells.Item($taskPotassium,8).Value2 'Chưa đủ cơ sở' 'unknown nutrient status'
 $taskInput.Range('G7').Value2=300;$taskExcel.CalculateFullRebuild()
 Check-Near $taskReport.Cells.Item($taskEnergy,3).Value2 325 'mean after edit'
 Check-Near $taskReport.Cells.Item($taskEnergy,7).Value2 0 'within days after edit'
 Check-Text $taskReport.Cells.Item($taskEnergy,8).Value2 'Cao hơn khoảng' 'above after edit'
 $taskInput.Range('O7').Value2='Tên thực tế cần ước tính';$taskExcel.CalculateFullRebuild()
 Check-Text $taskReport.Cells.Item($taskEnergy,8).Value2 'Chưa đủ cơ sở' 'reference estimate not a clinical conclusion'
 Check-Near $taskReport.Cells.Item($taskEnergy,6).Value2 0 'estimated data not assessed'
 $taskInput.Range('O7').Value2='';$taskInput.Range('G7').Value2=0;$taskInput.Range('G8').Value2=0;$taskExcel.CalculateFullRebuild()
 Check-Near $taskReport.Cells.Item($taskEnergy,3).Value2 0 'zero quantities remain zero'
 Check-Text $taskReport.Cells.Item($taskEnergy,8).Value2 'Thấp hơn khoảng' 'zero energy below reference'
 $taskInput.Range('G7').Value2=300;$taskInput.Range('G8').Value2=200;$taskExcel.CalculateFullRebuild()
 foreach($sheet in $taskBook.Worksheets){foreach($value in $sheet.UsedRange.Value2){if($value -is [int] -and $value -ge -2146826300 -and $value -le -2146826240){throw "formula error in $($sheet.Name)"}}};$taskChecks++
 $taskReport.ExportAsFixedFormat(0,(Join-Path $taskEvidence 'clinical-native-report.pdf'));$taskChecks++
 $taskReport.Activate();$taskBook.SaveAs((Join-Path $taskEvidence 'clinical-native-saved.xlsx'),51)
 [IO.File]::WriteAllText((Join-Path $taskEvidence 'clinical-native-proof.json'),('{"checks":'+$taskChecks+',"nativeExcel":true,"clinicalEnergyRow":'+$taskEnergy+'}'))
 Write-Output "Clinical native Excel: $taskChecks checks passed."
}finally{if($taskBook){$taskBook.Close($false)};if($taskExcel){$taskExcel.Quit();[Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskExcel)|Out-Null};[GC]::Collect();[GC]::WaitForPendingFinalizers()}
