// ExtractCoords.cs
// AutoCAD Design Automation Plugin for extracting ALL drawing entities
// Designed for Autodesk Platform Services (APS) Design Automation API

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.ApplicationServices.Core;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.Geometry;

[assembly: CommandClass(typeof(InteriorApp.ExtractCoordsCommand))]
[assembly: ExtensionApplication(typeof(InteriorApp.ExtractCoordsApp))]

namespace InteriorApp
{
    #region Data Classes

    /// <summary>
    /// 2D 좌표
    /// </summary>
    public class Point2D
    {
        public double X { get; set; }
        public double Y { get; set; }
    }

    /// <summary>
    /// 3D 좌표
    /// </summary>
    public class Point3D
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double Z { get; set; }
    }

    /// <summary>
    /// Line 데이터
    /// </summary>
    public class LineData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public Point3D StartPoint { get; set; }
        public Point3D EndPoint { get; set; }
        public double Length { get; set; }
    }

    /// <summary>
    /// Polyline 데이터
    /// </summary>
    public class PolylineData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public bool IsClosed { get; set; }
        public List<Point2D> Vertices { get; set; }
        public double Length { get; set; }
        public double Area { get; set; }
    }

    /// <summary>
    /// Arc 데이터
    /// </summary>
    public class ArcData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public Point3D Center { get; set; }
        public double Radius { get; set; }
        public double StartAngle { get; set; }
        public double EndAngle { get; set; }
        public double Length { get; set; }
    }

    /// <summary>
    /// Circle 데이터
    /// </summary>
    public class CircleData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public Point3D Center { get; set; }
        public double Radius { get; set; }
    }

    /// <summary>
    /// Block Reference 데이터
    /// </summary>
    public class BlockReferenceData
    {
        public string Handle { get; set; }
        public string Name { get; set; }
        public string Layer { get; set; }
        public Point3D Position { get; set; }
        public double Rotation { get; set; }
        public double ScaleX { get; set; }
        public double ScaleY { get; set; }
        public double ScaleZ { get; set; }
        public Dictionary<string, string> Attributes { get; set; }
    }

    /// <summary>
    /// Text 데이터
    /// </summary>
    public class TextData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public string Content { get; set; }
        public Point3D Position { get; set; }
        public double Height { get; set; }
        public double Rotation { get; set; }
    }

    /// <summary>
    /// MText 데이터
    /// </summary>
    public class MTextData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public string Content { get; set; }
        public Point3D Location { get; set; }
        public double Width { get; set; }
        public double Height { get; set; }
    }

    /// <summary>
    /// Hatch 데이터
    /// </summary>
    public class HatchData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public string PatternName { get; set; }
        public double Area { get; set; }
    }

    /// <summary>
    /// Dimension 데이터
    /// </summary>
    public class DimensionData
    {
        public string Handle { get; set; }
        public string Layer { get; set; }
        public string DimensionType { get; set; }
        public double Measurement { get; set; }
        public string DimensionText { get; set; }
    }

    /// <summary>
    /// 레이어 정보
    /// </summary>
    public class LayerInfo
    {
        public string Name { get; set; }
        public bool IsOn { get; set; }
        public bool IsFrozen { get; set; }
        public string Color { get; set; }
        public int EntityCount { get; set; }
    }

    /// <summary>
    /// 전체 추출 결과
    /// </summary>
    public class FullExtractionResult
    {
        public bool Success { get; set; }
        public string FileName { get; set; }
        public string Units { get; set; }
        public string ErrorMessage { get; set; }

        // 도면 범위
        public Point3D ExtentsMin { get; set; }
        public Point3D ExtentsMax { get; set; }

        // 레이어 정보
        public List<LayerInfo> Layers { get; set; }

        // 엔티티 데이터
        public List<LineData> Lines { get; set; }
        public List<PolylineData> Polylines { get; set; }
        public List<ArcData> Arcs { get; set; }
        public List<CircleData> Circles { get; set; }
        public List<BlockReferenceData> BlockReferences { get; set; }
        public List<TextData> Texts { get; set; }
        public List<MTextData> MTexts { get; set; }
        public List<HatchData> Hatches { get; set; }
        public List<DimensionData> Dimensions { get; set; }

        // 통계
        public Dictionary<string, int> EntityCounts { get; set; }
        public Dictionary<string, int> LayerEntityCounts { get; set; }
    }

    #endregion

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
    /// Main command class for extracting all entities
    /// </summary>
    public class ExtractCoordsCommand
    {
        /// <summary>
        /// EXTRACT_COORDS command - extracts all entities to JSON
        /// </summary>
        [CommandMethod("EXTRACT_COORDS", CommandFlags.Modal)]
        public void ExtractCoordinates()
        {
            var result = new FullExtractionResult
            {
                Success = false,
                Layers = new List<LayerInfo>(),
                Lines = new List<LineData>(),
                Polylines = new List<PolylineData>(),
                Arcs = new List<ArcData>(),
                Circles = new List<CircleData>(),
                BlockReferences = new List<BlockReferenceData>(),
                Texts = new List<TextData>(),
                MTexts = new List<MTextData>(),
                Hatches = new List<HatchData>(),
                Dimensions = new List<DimensionData>(),
                EntityCounts = new Dictionary<string, int>(),
                LayerEntityCounts = new Dictionary<string, int>()
            };

            try
            {
                Database db = Application.DocumentManager.MdiActiveDocument?.Database;
                if (db == null)
                {
                    db = HostApplicationServices.WorkingDatabase;
                }

                if (db == null)
                {
                    result.ErrorMessage = "No database available";
                    WriteResult(result);
                    return;
                }

                result.FileName = Path.GetFileName(db.Filename);
                result.Units = GetUnitsString(db.Insunits);

                using (Transaction tr = db.TransactionManager.StartTransaction())
                {
                    // 도면 범위 추출
                    try
                    {
                        var extents = db.Extmax;
                        var extentsMin = db.Extmin;
                        result.ExtentsMax = new Point3D { X = Round(extents.X), Y = Round(extents.Y), Z = Round(extents.Z) };
                        result.ExtentsMin = new Point3D { X = Round(extentsMin.X), Y = Round(extentsMin.Y), Z = Round(extentsMin.Z) };
                    }
                    catch { }

                    // 레이어 정보 추출
                    ExtractLayers(db, tr, result);

                    // Model Space 엔티티 추출
                    BlockTable bt = tr.GetObject(db.BlockTableId, OpenMode.ForRead) as BlockTable;
                    BlockTableRecord modelSpace = tr.GetObject(
                        bt[BlockTableRecord.ModelSpace],
                        OpenMode.ForRead
                    ) as BlockTableRecord;

                    foreach (ObjectId objId in modelSpace)
                    {
                        Entity ent = tr.GetObject(objId, OpenMode.ForRead) as Entity;
                        if (ent == null) continue;

                        // 레이어별 카운트
                        if (!result.LayerEntityCounts.ContainsKey(ent.Layer))
                            result.LayerEntityCounts[ent.Layer] = 0;
                        result.LayerEntityCounts[ent.Layer]++;

                        // 엔티티 타입별 처리
                        ExtractEntity(ent, tr, result);
                    }

                    tr.Commit();
                }

                // 통계 계산
                result.EntityCounts["Lines"] = result.Lines.Count;
                result.EntityCounts["Polylines"] = result.Polylines.Count;
                result.EntityCounts["Arcs"] = result.Arcs.Count;
                result.EntityCounts["Circles"] = result.Circles.Count;
                result.EntityCounts["BlockReferences"] = result.BlockReferences.Count;
                result.EntityCounts["Texts"] = result.Texts.Count;
                result.EntityCounts["MTexts"] = result.MTexts.Count;
                result.EntityCounts["Hatches"] = result.Hatches.Count;
                result.EntityCounts["Dimensions"] = result.Dimensions.Count;

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
        /// 레이어 정보 추출
        /// </summary>
        private void ExtractLayers(Database db, Transaction tr, FullExtractionResult result)
        {
            try
            {
                LayerTable lt = tr.GetObject(db.LayerTableId, OpenMode.ForRead) as LayerTable;
                foreach (ObjectId layerId in lt)
                {
                    LayerTableRecord layer = tr.GetObject(layerId, OpenMode.ForRead) as LayerTableRecord;
                    if (layer != null)
                    {
                        result.Layers.Add(new LayerInfo
                        {
                            Name = layer.Name,
                            IsOn = !layer.IsOff,
                            IsFrozen = layer.IsFrozen,
                            Color = layer.Color.ToString()
                        });
                    }
                }
            }
            catch { }
        }

        /// <summary>
        /// 엔티티 추출 (타입별 분기)
        /// </summary>
        private void ExtractEntity(Entity ent, Transaction tr, FullExtractionResult result)
        {
            try
            {
                switch (ent)
                {
                    case Line line:
                        result.Lines.Add(new LineData
                        {
                            Handle = line.Handle.ToString(),
                            Layer = line.Layer,
                            StartPoint = ToPoint3D(line.StartPoint),
                            EndPoint = ToPoint3D(line.EndPoint),
                            Length = Round(line.Length)
                        });
                        break;

                    case Polyline pline:
                        var vertices = new List<Point2D>();
                        for (int i = 0; i < pline.NumberOfVertices; i++)
                        {
                            var pt = pline.GetPoint2dAt(i);
                            vertices.Add(new Point2D { X = Round(pt.X), Y = Round(pt.Y) });
                        }
                        result.Polylines.Add(new PolylineData
                        {
                            Handle = pline.Handle.ToString(),
                            Layer = pline.Layer,
                            IsClosed = pline.Closed,
                            Vertices = vertices,
                            Length = Round(pline.Length),
                            Area = pline.Closed ? Round(pline.Area) : 0
                        });
                        break;

                    case Polyline2d pline2d:
                        var verts2d = new List<Point2D>();
                        foreach (ObjectId vertId in pline2d)
                        {
                            Vertex2d vert = tr.GetObject(vertId, OpenMode.ForRead) as Vertex2d;
                            if (vert != null)
                            {
                                verts2d.Add(new Point2D { X = Round(vert.Position.X), Y = Round(vert.Position.Y) });
                            }
                        }
                        result.Polylines.Add(new PolylineData
                        {
                            Handle = pline2d.Handle.ToString(),
                            Layer = pline2d.Layer,
                            IsClosed = pline2d.Closed,
                            Vertices = verts2d,
                            Length = Round(pline2d.Length),
                            Area = 0
                        });
                        break;

                    case Polyline3d pline3d:
                        var verts3d = new List<Point2D>();
                        foreach (ObjectId vertId in pline3d)
                        {
                            PolylineVertex3d vert = tr.GetObject(vertId, OpenMode.ForRead) as PolylineVertex3d;
                            if (vert != null)
                            {
                                verts3d.Add(new Point2D { X = Round(vert.Position.X), Y = Round(vert.Position.Y) });
                            }
                        }
                        result.Polylines.Add(new PolylineData
                        {
                            Handle = pline3d.Handle.ToString(),
                            Layer = pline3d.Layer,
                            IsClosed = pline3d.Closed,
                            Vertices = verts3d,
                            Length = Round(pline3d.Length),
                            Area = 0
                        });
                        break;

                    case Arc arc:
                        result.Arcs.Add(new ArcData
                        {
                            Handle = arc.Handle.ToString(),
                            Layer = arc.Layer,
                            Center = ToPoint3D(arc.Center),
                            Radius = Round(arc.Radius),
                            StartAngle = Round(arc.StartAngle * (180.0 / Math.PI)),
                            EndAngle = Round(arc.EndAngle * (180.0 / Math.PI)),
                            Length = Round(arc.Length)
                        });
                        break;

                    case Circle circle:
                        result.Circles.Add(new CircleData
                        {
                            Handle = circle.Handle.ToString(),
                            Layer = circle.Layer,
                            Center = ToPoint3D(circle.Center),
                            Radius = Round(circle.Radius)
                        });
                        break;

                    case BlockReference blockRef:
                        string blockName = GetBlockName(blockRef, tr);
                        // Skip system blocks
                        if (!string.IsNullOrEmpty(blockName) && !blockName.StartsWith("*"))
                        {
                            var attrs = new Dictionary<string, string>();
                            foreach (ObjectId attrId in blockRef.AttributeCollection)
                            {
                                AttributeReference attrRef = tr.GetObject(attrId, OpenMode.ForRead) as AttributeReference;
                                if (attrRef != null)
                                {
                                    attrs[attrRef.Tag] = attrRef.TextString;
                                }
                            }

                            result.BlockReferences.Add(new BlockReferenceData
                            {
                                Handle = blockRef.Handle.ToString(),
                                Name = blockName,
                                Layer = blockRef.Layer,
                                Position = ToPoint3D(blockRef.Position),
                                Rotation = Round(blockRef.Rotation * (180.0 / Math.PI)),
                                ScaleX = Round(blockRef.ScaleFactors.X),
                                ScaleY = Round(blockRef.ScaleFactors.Y),
                                ScaleZ = Round(blockRef.ScaleFactors.Z),
                                Attributes = attrs
                            });
                        }
                        break;

                    case DBText text:
                        result.Texts.Add(new TextData
                        {
                            Handle = text.Handle.ToString(),
                            Layer = text.Layer,
                            Content = text.TextString,
                            Position = ToPoint3D(text.Position),
                            Height = Round(text.Height),
                            Rotation = Round(text.Rotation * (180.0 / Math.PI))
                        });
                        break;

                    case MText mtext:
                        result.MTexts.Add(new MTextData
                        {
                            Handle = mtext.Handle.ToString(),
                            Layer = mtext.Layer,
                            Content = mtext.Contents,
                            Location = ToPoint3D(mtext.Location),
                            Width = Round(mtext.Width),
                            Height = Round(mtext.Height)
                        });
                        break;

                    case Hatch hatch:
                        result.Hatches.Add(new HatchData
                        {
                            Handle = hatch.Handle.ToString(),
                            Layer = hatch.Layer,
                            PatternName = hatch.PatternName,
                            Area = Round(hatch.Area)
                        });
                        break;

                    case Dimension dim:
                        result.Dimensions.Add(new DimensionData
                        {
                            Handle = dim.Handle.ToString(),
                            Layer = dim.Layer,
                            DimensionType = dim.GetType().Name,
                            Measurement = Round(dim.Measurement),
                            DimensionText = dim.DimensionText
                        });
                        break;
                }
            }
            catch { }
        }

        /// <summary>
        /// Block Reference 이름 가져오기
        /// </summary>
        private string GetBlockName(BlockReference blockRef, Transaction tr)
        {
            try
            {
                if (blockRef.IsDynamicBlock)
                {
                    BlockTableRecord btr = tr.GetObject(
                        blockRef.DynamicBlockTableRecord,
                        OpenMode.ForRead
                    ) as BlockTableRecord;
                    return btr?.Name ?? blockRef.Name;
                }

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
        /// Point3d를 Point3D로 변환
        /// </summary>
        private Point3D ToPoint3D(Point3d pt)
        {
            return new Point3D
            {
                X = Round(pt.X),
                Y = Round(pt.Y),
                Z = Round(pt.Z)
            };
        }

        /// <summary>
        /// 반올림 (소수점 2자리)
        /// </summary>
        private double Round(double value)
        {
            return Math.Round(value, 2);
        }

        /// <summary>
        /// 단위 문자열 변환
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
        /// 결과를 JSON 파일로 저장
        /// </summary>
        private void WriteResult(FullExtractionResult result)
        {
            try
            {
                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                string json = JsonSerializer.Serialize(result, options);

                string outputPath = Path.Combine(
                    Environment.CurrentDirectory,
                    "result.json"
                );

                File.WriteAllText(outputPath, json);
            }
            catch (System.Exception ex)
            {
                try
                {
                    string tempPath = Path.Combine(
                        Path.GetTempPath(),
                        "extract_coords_result.json"
                    );

                    var errorResult = new FullExtractionResult
                    {
                        Success = false,
                        ErrorMessage = $"Failed to write result: {ex.Message}"
                    };

                    string json = JsonSerializer.Serialize(errorResult);
                    File.WriteAllText(tempPath, json);
                }
                catch { }
            }
        }
    }
}
