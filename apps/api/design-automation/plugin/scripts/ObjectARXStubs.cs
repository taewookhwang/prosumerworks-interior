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
}

namespace Autodesk.AutoCAD.DatabaseServices
{
    public struct ObjectId
    {
        public bool IsNull
        {
            get { return true; }
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
    public enum UnitsValue { Undefined = 0, Inches = 1, Millimeters = 4 }

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

        public string EffectiveName()
        {
            return "";
        }
    }

    public class SymbolTable : DBObject { }
    public class BlockTable : SymbolTable { }
    public class SymbolTableRecord : DBObject { }

    public class BlockTableRecord : SymbolTableRecord
    {
        public string Name
        {
            get { return ""; }
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
