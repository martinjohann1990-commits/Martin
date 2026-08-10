Option Explicit

' ===========================================================================
' modExport - Simulation bzw. Szenario-Vergleich als eigene Datei ablegen
'
' Exportiert werden reine Werte: Die Zielmappe enthaelt keine Formeln, keine
' Verbindungen und kein VBA und laesst sich damit unbedenklich weitergeben.
' ===========================================================================


Sub Export_Simulation()
    ExportBlatt BLATT_SIM, "Simulation_" & Format$(Now, "yyyymmdd_hhmm")
End Sub


Sub Export_Szenarien()
    ExportBlatt BLATT_SZ, "Szenariovergleich_" & Format$(Now, "yyyymmdd_hhmm")
End Sub


Private Sub ExportBlatt(blatt As String, vorschlag As String)
    Dim ws As Worksheet, ziel As Workbook, zielBlatt As Worksheet
    Dim datei As Variant
    Dim quelle As Range
    Dim istCsv As Boolean
    Dim frueher As Boolean

    On Error GoTo Fehler
    Set ws = ThisWorkbook.Worksheets(blatt)

    datei = Application.GetSaveAsFilename( _
        InitialFileName:=vorschlag, _
        FileFilter:="Excel-Arbeitsmappe (*.xlsx),*.xlsx,CSV-Datei (*.csv),*.csv", _
        Title:="Export " & blatt)
    If VarType(datei) = vbBoolean Then Exit Sub

    istCsv = (LCase$(Right$(CStr(datei), 4)) = ".csv")

    frueher = Application.DisplayAlerts
    Application.DisplayAlerts = False
    Application.ScreenUpdating = False

    Set quelle = ExportBereich(ws)
    Set ziel = Application.Workbooks.Add
    Set zielBlatt = ziel.Worksheets(1)
    zielBlatt.Name = Left$(blatt, 31)

    ' Werte und Formate uebernehmen, aber keine Formeln
    quelle.Copy
    zielBlatt.Range("A1").PasteSpecial xlPasteColumnWidths
    zielBlatt.Range("A1").PasteSpecial xlPasteValues
    zielBlatt.Range("A1").PasteSpecial xlPasteFormats
    Application.CutCopyMode = False
    zielBlatt.Cells(1, 1).Select

    If istCsv Then
        ziel.SaveAs Filename:=CStr(datei), FileFormat:=xlCSV, Local:=True
    Else
        ziel.SaveAs Filename:=CStr(datei), FileFormat:=xlOpenXMLWorkbook
    End If
    ziel.Close SaveChanges:=False

    Application.DisplayAlerts = frueher
    Application.ScreenUpdating = True
    MsgBox "Export geschrieben:" & vbCrLf & CStr(datei), vbInformation, "Export"
    Exit Sub

Fehler:
    Application.CutCopyMode = False
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    MsgBox "Der Export ist fehlgeschlagen: " & Err.Description, vbExclamation, _
           "Export"
End Sub


' Begrenzt den Export auf den tatsaechlich benutzten Bereich des Blatts.
Private Function ExportBereich(ws As Worksheet) As Range
    Dim letzteZeile As Long, letzteSpalte As Long

    On Error Resume Next
    letzteZeile = ws.Cells.Find(What:="*", SearchOrder:=xlByRows, _
                                SearchDirection:=xlPrevious).Row
    letzteSpalte = ws.Cells.Find(What:="*", SearchOrder:=xlByColumns, _
                                 SearchDirection:=xlPrevious).Column
    On Error GoTo 0
    If letzteZeile = 0 Then letzteZeile = 1
    If letzteSpalte = 0 Then letzteSpalte = 1

    Set ExportBereich = ws.Range(ws.Cells(1, 1), ws.Cells(letzteZeile, letzteSpalte))
End Function
