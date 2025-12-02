# Create ObjectARX stub assemblies for build
# These are reference-only assemblies used for compilation

param(
    [string]$OutputPath = "lib"
)

Write-Host "Creating reference stub assemblies for build..."

# Ensure output directory exists
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null

# AcCoreMgd.il content
$acCoreIL = @'
.assembly extern mscorlib { .publickeytoken = (B7 7A 5C 56 19 34 E0 89) }
.assembly AcCoreMgd { .ver 24:0:0:0 }
.module AcCoreMgd.dll

.namespace Autodesk.AutoCAD.Runtime
{
  .class public auto ansi beforefieldinit CommandMethodAttribute extends [mscorlib]System.Attribute
  {
    .field private string commandName
    .method public hidebysig specialname rtspecialname instance void .ctor(string name) cil managed
    {
      ldarg.0
      call instance void [mscorlib]System.Attribute::.ctor()
      ldarg.0
      ldarg.1
      stfld string Autodesk.AutoCAD.Runtime.CommandMethodAttribute::commandName
      ret
    }
  }
}

.namespace Autodesk.AutoCAD.ApplicationServices.Core
{
  .class public auto ansi beforefieldinit Application extends [mscorlib]System.Object
  {
    .method public hidebysig static class Autodesk.AutoCAD.ApplicationServices.DocumentCollection get_DocumentManager() cil managed
    {
      ldnull
      ret
    }
  }
}

.namespace Autodesk.AutoCAD.ApplicationServices
{
  .class public auto ansi beforefieldinit DocumentCollection extends [mscorlib]System.Object
  {
    .method public hidebysig instance class Autodesk.AutoCAD.ApplicationServices.Document get_MdiActiveDocument() cil managed
    {
      ldnull
      ret
    }
  }

  .class public auto ansi beforefieldinit Document extends [mscorlib]System.Object
  {
    .method public hidebysig instance class Autodesk.AutoCAD.DatabaseServices.Database get_Database() cil managed
    {
      ldnull
      ret
    }
  }
}
'@

# AcDbMgd.il content
$acDbIL = @'
.assembly extern mscorlib { .publickeytoken = (B7 7A 5C 56 19 34 E0 89) }
.assembly extern AcCoreMgd { .ver 24:0:0:0 }
.assembly AcDbMgd { .ver 24:0:0:0 }
.module AcDbMgd.dll

.namespace Autodesk.AutoCAD.DatabaseServices
{
  .class public auto ansi beforefieldinit Database extends [mscorlib]System.Object implements [mscorlib]System.IDisposable
  {
    .field public class Autodesk.AutoCAD.DatabaseServices.TransactionManager TransactionManager
    .method public hidebysig newslot virtual instance void Dispose() cil managed { ret }
    .method public hidebysig instance valuetype Autodesk.AutoCAD.DatabaseServices.ObjectId get_BlockTableId() cil managed
    {
      .locals init (valuetype Autodesk.AutoCAD.DatabaseServices.ObjectId V_0)
      ldloca.s V_0
      initobj Autodesk.AutoCAD.DatabaseServices.ObjectId
      ldloc.0
      ret
    }
  }

  .class public sequential auto ansi sealed beforefieldinit ObjectId extends [mscorlib]System.ValueType
  {
    .field public native int Handle
    .method public hidebysig instance bool get_IsNull() cil managed { ldc.i4.0 ret }
  }

  .class public auto ansi beforefieldinit DBObject extends [mscorlib]System.Object implements [mscorlib]System.IDisposable
  {
    .method public hidebysig newslot virtual instance void Dispose() cil managed { ret }
    .method public hidebysig instance valuetype Autodesk.AutoCAD.DatabaseServices.ObjectId get_ObjectId() cil managed
    {
      .locals init (valuetype Autodesk.AutoCAD.DatabaseServices.ObjectId V_0)
      ldloca.s V_0
      initobj Autodesk.AutoCAD.DatabaseServices.ObjectId
      ldloc.0
      ret
    }
    .method public hidebysig instance class Autodesk.AutoCAD.DatabaseServices.Handle get_Handle() cil managed
    {
      ldnull
      ret
    }
  }

  .class public auto ansi beforefieldinit Handle extends [mscorlib]System.Object
  {
    .method public hidebysig virtual instance string ToString() cil managed
    {
      ldstr ""
      ret
    }
  }

  .class public auto ansi beforefieldinit Entity extends Autodesk.AutoCAD.DatabaseServices.DBObject
  {
    .method public hidebysig instance string get_Layer() cil managed { ldnull ret }
  }

  .class public auto ansi beforefieldinit BlockReference extends Autodesk.AutoCAD.DatabaseServices.Entity
  {
    .method public hidebysig instance valuetype Autodesk.AutoCAD.Geometry.Point3d get_Position() cil managed
    {
      .locals init (valuetype Autodesk.AutoCAD.Geometry.Point3d V_0)
      ldloca.s V_0
      initobj Autodesk.AutoCAD.Geometry.Point3d
      ldloc.0
      ret
    }
    .method public hidebysig instance float64 get_Rotation() cil managed { ldc.r8 0.0 ret }
    .method public hidebysig instance valuetype Autodesk.AutoCAD.Geometry.Scale3d get_ScaleFactors() cil managed
    {
      .locals init (valuetype Autodesk.AutoCAD.Geometry.Scale3d V_0)
      ldloca.s V_0
      initobj Autodesk.AutoCAD.Geometry.Scale3d
      ldloc.0
      ret
    }
    .method public hidebysig instance string get_Name() cil managed { ldnull ret }
    .method public hidebysig instance string EffectiveName() cil managed { ldnull ret }
  }

  .class public auto ansi beforefieldinit SymbolTable extends Autodesk.AutoCAD.DatabaseServices.DBObject
  {
  }

  .class public auto ansi beforefieldinit BlockTable extends Autodesk.AutoCAD.DatabaseServices.SymbolTable
  {
  }

  .class public auto ansi beforefieldinit SymbolTableRecord extends Autodesk.AutoCAD.DatabaseServices.DBObject
  {
  }

  .class public auto ansi beforefieldinit BlockTableRecord extends Autodesk.AutoCAD.DatabaseServices.SymbolTableRecord
  {
    .method public hidebysig instance string get_Name() cil managed { ldnull ret }
  }

  .class public auto ansi sealed beforefieldinit OpenMode extends [mscorlib]System.Enum
  {
    .field public specialname rtspecialname int32 value__
    .field public static literal valuetype Autodesk.AutoCAD.DatabaseServices.OpenMode ForRead = int32(0)
    .field public static literal valuetype Autodesk.AutoCAD.DatabaseServices.OpenMode ForWrite = int32(1)
  }

  .class public auto ansi beforefieldinit Transaction extends [mscorlib]System.Object implements [mscorlib]System.IDisposable
  {
    .method public hidebysig newslot virtual instance void Dispose() cil managed { ret }
    .method public hidebysig instance class Autodesk.AutoCAD.DatabaseServices.DBObject GetObject(valuetype Autodesk.AutoCAD.DatabaseServices.ObjectId id, valuetype Autodesk.AutoCAD.DatabaseServices.OpenMode mode) cil managed { ldnull ret }
    .method public hidebysig instance void Commit() cil managed { ret }
  }

  .class public auto ansi beforefieldinit TransactionManager extends [mscorlib]System.Object
  {
    .method public hidebysig instance class Autodesk.AutoCAD.DatabaseServices.Transaction StartTransaction() cil managed { ldnull ret }
  }
}

.namespace Autodesk.AutoCAD.Geometry
{
  .class public sequential auto ansi sealed beforefieldinit Point3d extends [mscorlib]System.ValueType
  {
    .field public float64 X
    .field public float64 Y
    .field public float64 Z
  }

  .class public sequential auto ansi sealed beforefieldinit Scale3d extends [mscorlib]System.ValueType
  {
    .field public float64 X
    .field public float64 Y
    .field public float64 Z
  }
}
'@

# Write IL files
$acCoreIL | Out-File -FilePath "AcCoreMgd.il" -Encoding ASCII
$acDbIL | Out-File -FilePath "AcDbMgd.il" -Encoding ASCII

# Find ilasm.exe from .NET Framework
$ilasmPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\ilasm.exe"
if (-not (Test-Path $ilasmPath)) {
    $ilasmPath = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\ilasm.exe"
}

if (-not (Test-Path $ilasmPath)) {
    Write-Error "Could not find ilasm.exe"
    exit 1
}

Write-Host "Using ilasm: $ilasmPath"

# Compile IL to DLL
Write-Host "Compiling AcCoreMgd.dll..."
& $ilasmPath /dll /quiet /output:"$OutputPath\AcCoreMgd.dll" AcCoreMgd.il
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to compile AcCoreMgd.dll"
    exit 1
}

Write-Host "Compiling AcDbMgd.dll..."
& $ilasmPath /dll /quiet /output:"$OutputPath\AcDbMgd.dll" AcDbMgd.il
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to compile AcDbMgd.dll"
    exit 1
}

# Clean up IL files
Remove-Item "AcCoreMgd.il" -ErrorAction SilentlyContinue
Remove-Item "AcDbMgd.il" -ErrorAction SilentlyContinue

Write-Host "SDK directory contents:"
Get-ChildItem $OutputPath

Write-Host "Stub assemblies created successfully!"
