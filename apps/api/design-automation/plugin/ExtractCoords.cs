// ExtractCoords.cs
// AutoCAD Design Automation Plugin for extracting Block Reference coordinates
// Designed for Autodesk Platform Services (APS) Design Automation API

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Autodesk.AutoCAD.ApplicationServices.Core;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.Runtime;

[assembly: CommandClass(typeof(InteriorApp.ExtractCoordsCommand))]
[assembly: ExtensionApplication(typeof(InteriorApp.ExtractCoordsApp))]

namespace InteriorApp
{
    /// <summary>
    /// Block Reference 데이터를 담는 클래스
    /// </summary>
    public class BlockReferenceData
    {
        public string Handle { get; set; }
        public string EffectiveName { get; set; }
        public double PositionX { get; set; }
        public double PositionY { get; set; }
        public double PositionZ { get; set; }
        public string Layer { get; set; }
        public double Rotation { get; set; }
        public double ScaleX { get; set; }
        public double ScaleY { get; set; }
        public double ScaleZ { get; set; }
    }

    /// <summary>
    /// 추출 결과를 담는 클래스
    /// </summary>
    public class ExtractionResult
    {
        public bool Success { get; set; }
        public string FileName { get; set; }
        public int TotalBlockReferences { get; set; }
        public string Units { get; set; }
        public List<BlockReferenceData> BlockReferences { get; set; }
        public Dictionary<string, int> LayerCounts { get; set; }
        public string ErrorMessage { get; set; }
    }

    /// <summary>
    /// Application initialization class
    /// </summary>
    public class ExtractCoordsApp : IExtensionApplication
    {
        public void Initialize()
        {
            // Plugin initialized - ready for Design Automation
        }

        public void Terminate()
        {
            // Cleanup if needed
        }
    }

    /// <summary>
    /// Main command class for extracting Block Reference coordinates
    /// </summary>
    public class ExtractCoordsCommand
    {
        /// <summary>
        /// EXTRACT_COORDS command - extracts all Block Reference coordinates to JSON
        /// This command is designed to run in Design Automation (headless AutoCAD)
        /// </summary>
        [CommandMethod("EXTRACT_COORDS", CommandFlags.Modal)]
        public void ExtractCoordinates()
        {
            var result = new ExtractionResult
            {
                Success = false,
                BlockReferences = new List<BlockReferenceData>(),
                LayerCounts = new Dictionary<string, int>()
            };

            try
            {
                // Get the current document's database
                Database db = Application.DocumentManager.MdiActiveDocument?.Database;

                if (db == null)
                {
                    // In Design Automation, use HostApplicationServices
                    db = HostApplicationServices.WorkingDatabase;
                }

                if (db == null)
                {
                    result.ErrorMessage = "No database available";
                    WriteResult(result);
                    return;
                }

                // Get file name
                result.FileName = Path.GetFileName(db.Filename);

                // Get drawing units
                result.Units = GetUnitsString(db.Insunits);

                using (Transaction tr = db.TransactionManager.StartTransaction())
                {
                    // Open the Block Table for read
                    BlockTable bt = tr.GetObject(db.BlockTableId, OpenMode.ForRead) as BlockTable;

                    // Open Model Space
                    BlockTableRecord modelSpace = tr.GetObject(
                        bt[BlockTableRecord.ModelSpace],
                        OpenMode.ForRead
                    ) as BlockTableRecord;

                    // Iterate through all entities in Model Space
                    foreach (ObjectId objId in modelSpace)
                    {
                        Entity ent = tr.GetObject(objId, OpenMode.ForRead) as Entity;

                        // Check if it's a Block Reference
                        if (ent is BlockReference blockRef)
                        {
                            // Skip anonymous blocks (like *Model_Space, *Paper_Space)
                            string effectiveName = GetEffectiveName(blockRef, tr);
                            if (string.IsNullOrEmpty(effectiveName) || effectiveName.StartsWith("*"))
                            {
                                continue;
                            }

                            // Skip AutoCAD internal blocks (A$C...)
                            if (effectiveName.StartsWith("A$C", StringComparison.OrdinalIgnoreCase))
                            {
                                continue;
                            }

                            var blockData = new BlockReferenceData
                            {
                                Handle = blockRef.Handle.ToString(),
                                EffectiveName = effectiveName,
                                PositionX = Math.Round(blockRef.Position.X, 4),
                                PositionY = Math.Round(blockRef.Position.Y, 4),
                                PositionZ = Math.Round(blockRef.Position.Z, 4),
                                Layer = blockRef.Layer,
                                Rotation = Math.Round(blockRef.Rotation * (180.0 / Math.PI), 2), // Convert to degrees
                                ScaleX = Math.Round(blockRef.ScaleFactors.X, 4),
                                ScaleY = Math.Round(blockRef.ScaleFactors.Y, 4),
                                ScaleZ = Math.Round(blockRef.ScaleFactors.Z, 4)
                            };

                            result.BlockReferences.Add(blockData);

                            // Count by layer
                            if (!result.LayerCounts.ContainsKey(blockRef.Layer))
                            {
                                result.LayerCounts[blockRef.Layer] = 0;
                            }
                            result.LayerCounts[blockRef.Layer]++;
                        }
                    }

                    tr.Commit();
                }

                result.TotalBlockReferences = result.BlockReferences.Count;
                result.Success = true;
            }
            catch (System.Exception ex)
            {
                result.Success = false;
                result.ErrorMessage = ex.Message;
            }

            WriteResult(result);
        }

        /// <summary>
        /// Gets the effective name of a block reference (handles dynamic blocks)
        /// </summary>
        private string GetEffectiveName(BlockReference blockRef, Transaction tr)
        {
            try
            {
                // For dynamic blocks, use EffectiveName property
                if (blockRef.IsDynamicBlock)
                {
                    BlockTableRecord btr = tr.GetObject(
                        blockRef.DynamicBlockTableRecord,
                        OpenMode.ForRead
                    ) as BlockTableRecord;
                    return btr?.Name ?? blockRef.Name;
                }

                // For regular blocks, use Name property
                BlockTableRecord regularBtr = tr.GetObject(
                    blockRef.BlockTableRecord,
                    OpenMode.ForRead
                ) as BlockTableRecord;
                return regularBtr?.Name ?? blockRef.Name;
            }
            catch
            {
                return blockRef.Name;
            }
        }

        /// <summary>
        /// Converts AutoCAD unit type to string
        /// </summary>
        private string GetUnitsString(UnitsValue units)
        {
            return units switch
            {
                UnitsValue.Millimeters => "mm",
                UnitsValue.Centimeters => "cm",
                UnitsValue.Meters => "m",
                UnitsValue.Inches => "in",
                UnitsValue.Feet => "ft",
                UnitsValue.Undefined => "unitless",
                _ => units.ToString()
            };
        }

        /// <summary>
        /// Writes the result to a JSON file
        /// In Design Automation, output files should be written to the working directory
        /// </summary>
        private void WriteResult(ExtractionResult result)
        {
            try
            {
                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                string json = JsonSerializer.Serialize(result, options);

                // Write to current working directory (Design Automation output)
                string outputPath = Path.Combine(
                    Environment.CurrentDirectory,
                    "result.json"
                );

                File.WriteAllText(outputPath, json);
            }
            catch (System.Exception ex)
            {
                // Fallback: try writing to temp directory
                try
                {
                    string tempPath = Path.Combine(
                        Path.GetTempPath(),
                        "extract_coords_result.json"
                    );

                    var errorResult = new ExtractionResult
                    {
                        Success = false,
                        ErrorMessage = $"Failed to write result: {ex.Message}"
                    };

                    string json = JsonSerializer.Serialize(errorResult);
                    File.WriteAllText(tempPath, json);
                }
                catch
                {
                    // Silent fail - nothing we can do
                }
            }
        }
    }
}
