// Minimal ObjectARX stub for compilation only
// These stubs provide the type definitions needed to compile the plugin
// The actual ObjectARX assemblies are provided by Design Automation runtime

namespace Autodesk.AutoCAD.Runtime
{
    [System.AttributeUsage(System.AttributeTargets.Class)]
    public class CommandClassAttribute : System.Attribute { }

    [System.AttributeUsage(System.AttributeTargets.Class)]
    public class ExtensionApplicationAttribute : System.Attribute { }

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
        public static Autodesk.AutoCAD.ApplicationServices.DocumentCollection DocumentManager => null;
    }
}

namespace Autodesk.AutoCAD.ApplicationServices
{
    public class DocumentCollection
    {
        public Document MdiActiveDocument => null;
    }

    public class Document
    {
        public Autodesk.AutoCAD.DatabaseServices.Database Database => null;
    }
}

namespace Autodesk.AutoCAD.DatabaseServices
{
    public struct ObjectId
    {
        public bool IsNull => true;
    }

    public class Handle
    {
        public override string ToString() => "";
    }

    public enum OpenMode { ForRead = 0, ForWrite = 1 }
    public enum UnitsValue { Undefined = 0, Inches = 1, Millimeters = 4 }

    public class Database : System.IDisposable
    {
        public ObjectId BlockTableId => default;
        public TransactionManager TransactionManager => null;
        public UnitsValue Insunits => UnitsValue.Millimeters;
        public void Dispose() { }
    }

    public class TransactionManager
    {
        public Transaction StartTransaction() => null;
    }

    public class Transaction : System.IDisposable
    {
        public DBObject GetObject(ObjectId id, OpenMode mode) => null;
        public void Commit() { }
        public void Dispose() { }
    }

    public class DBObject : System.IDisposable
    {
        public ObjectId ObjectId => default;
        public Handle Handle => null;
        public void Dispose() { }
    }

    public class Entity : DBObject
    {
        public string Layer => "";
    }

    public class BlockReference : Entity
    {
        public Autodesk.AutoCAD.Geometry.Point3d Position => default;
        public double Rotation => 0;
        public Autodesk.AutoCAD.Geometry.Scale3d ScaleFactors => default;
        public string Name => "";
        public string EffectiveName() => "";
    }

    public class SymbolTable : DBObject { }
    public class BlockTable : SymbolTable { }
    public class SymbolTableRecord : DBObject { }
    public class BlockTableRecord : SymbolTableRecord
    {
        public string Name => "";
    }
}

namespace Autodesk.AutoCAD.Geometry
{
    public struct Point3d
    {
        public double X, Y, Z;
    }

    public struct Scale3d
    {
        public double X, Y, Z;
    }
}
