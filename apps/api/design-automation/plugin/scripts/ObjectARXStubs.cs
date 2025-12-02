// Minimal ObjectARX stub for compilation only
// These stubs provide the type definitions needed to compile the plugin
// The actual ObjectARX assemblies are provided by Design Automation runtime
// NOTE: Using C# 5 syntax for compatibility with .NET Framework csc.exe

namespace Autodesk.AutoCAD.Runtime
{
    [System.AttributeUsage(System.AttributeTargets.Assembly)]
    public class CommandClassAttribute : System.Attribute
    {
        public CommandClassAttribute(System.Type type) { }
    }

    [System.AttributeUsage(System.AttributeTargets.Assembly)]
    public class ExtensionApplicationAttribute : System.Attribute
    {
        public ExtensionApplicationAttribute(System.Type type) { }
    }

    [System.AttributeUsage(System.AttributeTargets.Method)]
    public class CommandMethodAttribute : System.Attribute
    {
        public CommandMethodAttribute(string name) { }
        public CommandMethodAttribute(string name, CommandFlags flags) { }
    }

    [System.Flags]
    public enum CommandFlags { Modal = 0, Session = 2 }

    public interface IExtensionApplication
    {
        void Initialize();
        void Terminate();
    }
}

namespace Autodesk.AutoCAD.ApplicationServices.Core
{
    public static class Application
    {
        public static Autodesk.AutoCAD.ApplicationServices.DocumentCollection DocumentManager
        {
            get { return null; }
        }
    }
}

namespace Autodesk.AutoCAD.ApplicationServices
{
    public class DocumentCollection
    {
        public Document MdiActiveDocument
        {
            get { return null; }
        }
    }

    public class Document
    {
        public Autodesk.AutoCAD.DatabaseServices.Database Database
        {
            get { return null; }
        }
    }

    public class HostApplicationServices
    {
        public static HostApplicationServices Current
        {
            get { return null; }
        }

        public static Autodesk.AutoCAD.DatabaseServices.Database WorkingDatabase
        {
            get { return null; }
            set { }
        }

        public string FindFile(string fileName, Autodesk.AutoCAD.DatabaseServices.Database db, FindFileHint hint)
        {
            return "";
        }
    }

    public enum FindFileHint
    {
        Default = 0,
        CompiledShapeFile = 1,
        TrueTypeFontFile = 2,
        EmbeddedImageFile = 3,
        XRefDrawing = 4,
        PatternFile = 5,
        ArxApplication = 6,
        FontMapFile = 7,
        FontFile = 8
    }
}

namespace Autodesk.AutoCAD.DatabaseServices
{
    public struct ObjectId
    {
        public bool IsNull
        {
            get { return true; }
        }

        public bool IsValid
        {
            get { return false; }
        }
    }

    public class Handle
    {
        public override string ToString()
        {
            return "";
        }
    }

    public enum OpenMode { ForRead = 0, ForWrite = 1 }

    public enum UnitsValue
    {
        Undefined = 0,
        Inches = 1,
        Feet = 2,
        Miles = 3,
        Millimeters = 4,
        Centimeters = 5,
        Meters = 6,
        Kilometers = 7,
        Microinches = 8,
        Mils = 9,
        Yards = 10,
        Angstroms = 11,
        Nanometers = 12,
        Microns = 13,
        Decimeters = 14,
        Decameters = 15,
        Hectometers = 16,
        Gigameters = 17,
        AstronomicalUnits = 18,
        LightYears = 19,
        Parsecs = 20
    }

    public class Database : System.IDisposable
    {
        public ObjectId BlockTableId
        {
            get { return default(ObjectId); }
        }

        public TransactionManager TransactionManager
        {
            get { return null; }
        }

        public UnitsValue Insunits
        {
            get { return UnitsValue.Millimeters; }
        }

        public string Filename
        {
            get { return ""; }
        }

        public void Dispose() { }
    }

    public class TransactionManager
    {
        public Transaction StartTransaction()
        {
            return null;
        }
    }

    public class Transaction : System.IDisposable
    {
        public DBObject GetObject(ObjectId id, OpenMode mode)
        {
            return null;
        }

        public void Commit() { }
        public void Dispose() { }
    }

    public class DBObject : System.IDisposable
    {
        public ObjectId ObjectId
        {
            get { return default(ObjectId); }
        }

        public Handle Handle
        {
            get { return null; }
        }

        public void Dispose() { }
    }

    public class Entity : DBObject
    {
        public string Layer
        {
            get { return ""; }
        }
    }

    public class BlockReference : Entity
    {
        public Autodesk.AutoCAD.Geometry.Point3d Position
        {
            get { return default(Autodesk.AutoCAD.Geometry.Point3d); }
        }

        public double Rotation
        {
            get { return 0; }
        }

        public Autodesk.AutoCAD.Geometry.Scale3d ScaleFactors
        {
            get { return default(Autodesk.AutoCAD.Geometry.Scale3d); }
        }

        public string Name
        {
            get { return ""; }
        }

        public ObjectId BlockTableRecord
        {
            get { return default(ObjectId); }
        }

        public ObjectId DynamicBlockTableRecord
        {
            get { return default(ObjectId); }
        }

        public bool IsDynamicBlock
        {
            get { return false; }
        }

        public string EffectiveName()
        {
            return "";
        }
    }

    public class SymbolTable : DBObject, System.Collections.IEnumerable
    {
        public System.Collections.IEnumerator GetEnumerator()
        {
            return null;
        }
    }

    public class BlockTable : SymbolTable
    {
        public ObjectId this[string name]
        {
            get { return default(ObjectId); }
        }

        public bool Has(string name)
        {
            return false;
        }
    }

    public class SymbolTableRecord : DBObject { }

    public class BlockTableRecord : SymbolTableRecord, System.Collections.IEnumerable
    {
        public const string ModelSpace = "*Model_Space";
        public const string PaperSpace = "*Paper_Space";

        public string Name
        {
            get { return ""; }
        }

        public System.Collections.IEnumerator GetEnumerator()
        {
            return null;
        }
    }
}

namespace Autodesk.AutoCAD.Geometry
{
    public struct Point3d
    {
        public double X;
        public double Y;
        public double Z;
    }

    public struct Scale3d
    {
        public double X;
        public double Y;
        public double Z;
    }
}
