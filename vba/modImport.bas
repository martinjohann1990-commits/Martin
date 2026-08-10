Option Explicit

' ===========================================================================
' modImport - Power-Query-Import fuer Historie und Forecast
'
' Die Abfragen werden zur Laufzeit per ThisWorkbook.Queries.Add angelegt
' (Excel 2016 oder neuer). Sie sind vollstaendig parametrisiert: Quellpfad,
' Trennzeichen, m3 pro Palette und das Spalten-Mapping werden aus dem Blatt
' Import_Mapping gelesen. Andere Spaltennamen in der Quelle erfordern damit
' nur eine Aenderung in der Mapping-Tabelle, nicht in der Abfrage.
' ===========================================================================

Private Const ANKER As String = "A4"


' ---------------------------------------------------------------------------
' M-Code der Abfrage. Statt doppelter Anfuehrungszeichen wird "§" geschrieben
' und am Ende ersetzt - so bleibt der M-Code lesbar.
' ---------------------------------------------------------------------------
Private Function MCode(pfadName As String, quellSpalte As String) As String
    Dim m As String

    m = "let" & vbCrLf & _
        "    Pfad = Text.From(Excel.CurrentWorkbook(){[Name=§" & pfadName & "§]}[Content]{0}[Column1])," & vbCrLf & _
        "    Trenner = Text.From(Excel.CurrentWorkbook(){[Name=§Param_Trennzeichen§]}[Content]{0}[Column1])," & vbCrLf & _
        "    M3 = Number.From(Excel.CurrentWorkbook(){[Name=§Param_M3_pro_Palette§]}[Content]{0}[Column1])," & vbCrLf & _
        "    Quelltabelle = Excel.CurrentWorkbook(){[Name=§Param_Quelltabelle§]}[Content]{0}[Column1]," & vbCrLf & _
        "    Mapping = Excel.CurrentWorkbook(){[Name=§tblMapping§]}[Content]," & vbCrLf & _
        "    Geprueft = if Pfad = null or Pfad = §§ then" & vbCrLf & _
        "        error §Es ist kein Quellpfad hinterlegt. Bitte die Schaltflaeche 'Datei importieren' verwenden.§" & vbCrLf & _
        "        else Pfad," & vbCrLf & _
        "    Endung = Text.Lower(Text.End(Geprueft, 4))," & vbCrLf & _
        "    IstText = (Endung = §.csv§ or Endung = §.txt§)," & vbCrLf & _
        "    Roh = if IstText then" & vbCrLf & _
        "            Csv.Document(File.Contents(Geprueft), [Delimiter=Trenner, Encoding=1252, QuoteStyle=QuoteStyle.Csv])" & vbCrLf & _
        "          else" & vbCrLf & _
        "            let" & vbCrLf & _
        "                Mappe = Excel.Workbook(File.Contents(Geprueft), null, true)," & vbCrLf & _
        "                Treffer = if Quelltabelle = null or Quelltabelle = §§ then Mappe{0}[Data]" & vbCrLf & _
        "                          else Table.SelectRows(Mappe, each [Name] = Quelltabelle){0}[Data]" & vbCrLf & _
        "            in Treffer," & vbCrLf & _
        "    Kopf = Table.PromoteHeaders(Roh, [PromoteAllScalars=true])," & vbCrLf & _
        "    Vorhanden = Table.ColumnNames(Kopf)," & vbCrLf & _
        "    MapZeilen = Table.ToRecords(Mapping)," & vbCrLf & _
        "    Umbenennungen = List.Transform(" & vbCrLf & _
        "        List.Select(MapZeilen, each Record.Field(_, §" & quellSpalte & "§) <> null" & vbCrLf & _
        "            and List.Contains(Vorhanden, Record.Field(_, §" & quellSpalte & "§))" & vbCrLf & _
        "            and Record.Field(_, §" & quellSpalte & "§) <> Record.Field(_, §Zielfeld§))," & vbCrLf & _
        "        each {Record.Field(_, §" & quellSpalte & "§), Record.Field(_, §Zielfeld§)})," & vbCrLf & _
        "    Umbenannt = Table.RenameColumns(Kopf, Umbenennungen, MissingField.Ignore)," & vbCrLf & _
        "    Zielfelder = List.Transform(MapZeilen, each Record.Field(_, §Zielfeld§))," & vbCrLf & _
        "    Ergaenzt = List.Accumulate(Zielfelder, Umbenannt, (tab, feld) =>" & vbCrLf & _
        "        if List.Contains(Table.ColumnNames(tab), feld) then tab" & vbCrLf & _
        "        else Table.AddColumn(tab, feld, each null))," & vbCrLf & _
        "    NurZielfelder = Table.SelectColumns(Ergaenzt, Zielfelder)," & vbCrLf & _
        "    Typisiert = Table.TransformColumnTypes(NurZielfelder, {" & vbCrLf & _
        "        {§Datum§, type date}, {§Kunde§, type text}, {§Land/Region§, type text}," & vbCrLf & _
        "        {§Produktkategorie§, type text}, {§Menge (Stück)§, type number}," & vbCrLf & _
        "        {§EUR-Umsatz§, type number}, {§Transportvolumen§, type number}," & vbCrLf & _
        "        {§Paletten§, type number}})," & vbCrLf & _
        "    OhneLeerzeilen = Table.SelectRows(Typisiert, each [Datum] <> null)," & vbCrLf & _
        "    MitPalettenAequivalent = Table.AddColumn(OhneLeerzeilen, §Paletten-Äquivalent§, each" & vbCrLf & _
        "        if [Paletten] <> null and [Paletten] > 0 then [Paletten]" & vbCrLf & _
        "        else if [Transportvolumen] <> null and M3 > 0 then [Transportvolumen] / M3" & vbCrLf & _
        "        else 0, type number)," & vbCrLf & _
        "    Sortiert = Table.Sort(MitPalettenAequivalent, {{§Datum§, Order.Ascending}})" & vbCrLf & _
        "in" & vbCrLf & _
        "    Sortiert"

    MCode = Replace(m, "§", Chr(34))
End Function


' ---------------------------------------------------------------------------
' Schaltflaechen
' ---------------------------------------------------------------------------

Sub Import_Historie_Datei()
    DateiImportieren "Historie", "Pfad_Historie", "B4", "Quellspalte Historie", _
                     BLATT_HIST, "tblHistorie"
End Sub


Sub Import_Forecast_Datei()
    DateiImportieren "Forecast", "Pfad_Forecast", "B5", "Quellspalte Forecast", _
                     BLATT_FC, "tblForecast"
End Sub


Sub Import_Historie_Aktualisieren()
    AbfrageAktualisieren "Historie", "Pfad_Historie", "Quellspalte Historie", _
                         BLATT_HIST, "tblHistorie"
End Sub


Sub Import_Forecast_Aktualisieren()
    AbfrageAktualisieren "Forecast", "Pfad_Forecast", "Quellspalte Forecast", _
                         BLATT_FC, "tblForecast"
End Sub


' ---------------------------------------------------------------------------
' Ablauf
' ---------------------------------------------------------------------------

Private Sub DateiImportieren(abfrage As String, pfadName As String, _
                             pfadZelle As String, quellSpalte As String, _
                             blatt As String, tabName As String)
    Dim datei As Variant

    datei = Application.GetOpenFilename( _
        FileFilter:="Quelldateien (*.xlsx;*.xlsm;*.xls;*.csv;*.txt)," & _
                    "*.xlsx;*.xlsm;*.xls;*.csv;*.txt", _
        Title:="Quelldatei fuer " & abfrage & " auswaehlen")

    If VarType(datei) = vbBoolean Then Exit Sub   ' Abbruch im Dialog

    ThisWorkbook.Worksheets(BLATT_MAPPING).Range(pfadZelle).Value = CStr(datei)
    AbfrageAktualisieren abfrage, pfadName, quellSpalte, blatt, tabName
End Sub


Private Sub AbfrageAktualisieren(abfrage As String, pfadName As String, _
                                 quellSpalte As String, blatt As String, _
                                 tabName As String)
    Dim pfad As String
    Dim zeilen As Long

    On Error GoTo Fehler
    pfad = CStr(ThisWorkbook.Names(pfadName).RefersToRange.Value)
    If Len(Trim$(pfad)) = 0 Then
        MsgBox "Es ist noch keine Quelldatei hinterlegt." & vbCrLf & _
               "Bitte ""Datei importieren"" verwenden oder den Pfad auf dem " & _
               "Blatt " & BLATT_MAPPING & " eintragen.", vbExclamation, "Import"
        Exit Sub
    End If

    Application.ScreenUpdating = False
    AbfrageAnlegen abfrage, MCode(pfadName, quellSpalte)
    zeilen = AbfrageLaden(blatt, abfrage, tabName)
    Application.ScreenUpdating = True

    MsgBox "Import abgeschlossen." & vbCrLf & vbCrLf & _
           "Abfrage : " & abfrage & vbCrLf & _
           "Quelle  : " & pfad & vbCrLf & _
           "Zeilen  : " & zeilen, vbInformation, "Import"
    Exit Sub

Fehler:
    Application.ScreenUpdating = True
    MsgBox "Der Import ist fehlgeschlagen: " & Err.Description & vbCrLf & vbCrLf & _
           "Haeufige Ursachen: falscher Quellpfad, abweichende Spaltennamen " & _
           "(siehe Mapping-Tabelle) oder eine geoeffnete Quelldatei.", _
           vbExclamation, "Import"
End Sub


' Legt die Abfrage neu an (vorhandene gleichen Namens wird ersetzt).
Private Sub AbfrageAnlegen(name As String, formel As String)
    On Error Resume Next
    ThisWorkbook.Queries(name).Delete
    On Error GoTo 0
    ThisWorkbook.Queries.Add Name:=name, Formula:=formel
End Sub


' Verbindet die Abfrage mit einer Tabelle auf dem Zielblatt und liefert die
' Anzahl geladener Zeilen.
Private Function AbfrageLaden(blatt As String, abfrage As String, _
                              tabName As String) As Long
    Dim ws As Worksheet
    Dim lo As ListObject
    Dim verbindung As String

    Set ws = ThisWorkbook.Worksheets(blatt)

    ' bisherige Tabelle (Beispieldaten oder vorheriger Import) entfernen
    On Error Resume Next
    ws.ListObjects(tabName).Unlist
    On Error GoTo 0
    ws.Range(ANKER & ":I" & ws.Rows.Count).Clear

    verbindung = "OLEDB;Provider=Microsoft.Mashup.OleDb.1;Data Source=$Workbook$;" & _
                 "Location=" & abfrage & ";Extended Properties=" & Chr(34) & Chr(34)

    Set lo = ws.ListObjects.Add(SourceType:=xlSrcExternal, Source:=verbindung, _
                                Destination:=ws.Range(ANKER))
    lo.Name = tabName
    With lo.QueryTable
        .CommandType = xlCmdSql
        .CommandText = "SELECT * FROM [" & abfrage & "]"
        .BackgroundQuery = False
        .AdjustColumnWidth = False
        .PreserveFormatting = True
        .Refresh BackgroundQuery:=False
    End With
    lo.TableStyle = "TableStyleMedium2"

    If lo.ListRows.Count > 0 Then AbfrageLaden = lo.ListRows.Count
End Function


' ---------------------------------------------------------------------------
' Beispieldaten als echte CSV-Quelldatei schreiben, damit der Power-Query-Weg
' ohne fremde Datei getestet werden kann.
' ---------------------------------------------------------------------------

Sub Beispieldaten_CSV_Historie()
    BeispielCSV "A", "H", "Beispieldaten_Historie.csv", "B4"
End Sub


Sub Beispieldaten_CSV_Forecast()
    BeispielCSV "J", "Q", "Beispieldaten_Forecast.csv", "B5"
End Sub


Private Sub BeispielCSV(ersteSpalte As String, letzteSpalte As String, _
                        dateiName As String, pfadZelle As String)
    Dim ws As Worksheet
    Dim pfad As String, trenner As String, zeile As String
    Dim r As Long, c As Long, letzteZeile As Long
    Dim von As Long, bis As Long
    Dim kanal As Integer
    Dim wert As Variant

    On Error GoTo Fehler
    Set ws = ThisWorkbook.Worksheets(BLATT_BSP)
    trenner = CStr(ThisWorkbook.Names("Param_Trennzeichen").RefersToRange.Value)
    If Len(trenner) = 0 Then trenner = ";"

    von = ws.Range(ersteSpalte & "1").Column
    bis = ws.Range(letzteSpalte & "1").Column
    letzteZeile = ws.Cells(ws.Rows.Count, von).End(xlUp).Row
    If letzteZeile < 6 Then
        MsgBox "Auf dem Blatt " & BLATT_BSP & " sind keine Daten vorhanden.", _
               vbExclamation, "Beispieldaten"
        Exit Sub
    End If

    If Len(ThisWorkbook.Path) = 0 Then
        MsgBox "Bitte die Arbeitsmappe zuerst speichern, damit ein Ablageort " & _
               "fuer die CSV-Datei bekannt ist.", vbExclamation, "Beispieldaten"
        Exit Sub
    End If
    pfad = ThisWorkbook.Path & Application.PathSeparator & dateiName

    kanal = FreeFile
    Open pfad For Output As #kanal
    For r = 5 To letzteZeile          ' Zeile 5 enthaelt die Spaltenkoepfe
        zeile = ""
        For c = von To bis
            wert = ws.Cells(r, c).Value
            If IsDate(wert) Then
                zeile = zeile & Format$(wert, "yyyy-mm-dd")
            Else
                zeile = zeile & CStr(wert)
            End If
            If c < bis Then zeile = zeile & trenner
        Next c
        Print #kanal, zeile
    Next r
    Close #kanal

    ThisWorkbook.Worksheets(BLATT_MAPPING).Range(pfadZelle).Value = pfad
    MsgBox "CSV-Datei geschrieben:" & vbCrLf & pfad & vbCrLf & vbCrLf & _
           "Der Pfad ist auf dem Blatt " & BLATT_MAPPING & " eingetragen. " & _
           "Der Import kann jetzt mit ""Nur aktualisieren"" getestet werden.", _
           vbInformation, "Beispieldaten"
    Exit Sub

Fehler:
    On Error Resume Next
    Close #kanal
    MsgBox "Die CSV-Datei konnte nicht geschrieben werden: " & Err.Description, _
           vbExclamation, "Beispieldaten"
End Sub
