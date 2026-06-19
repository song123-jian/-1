package main

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS 中间件（允许 Flutter 调用）
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 健康检查
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "RJBC Backend",
		})
	})

	// 示例业务接口
	r.GET("/api/info", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"name":    "RJBC",
			"version": "1.0.0",
			"os":      runtime.GOOS,
			"arch":    runtime.GOARCH,
		})
	})

	// 启动前端（如果是单机模式，可以同时启动 Flutter 应用）
	if os.Getenv("RJBC_LAUNCH_FRONTEND") == "1" {
		go launchFrontend()
	}

	// 启动服务
	port := os.Getenv("RJBC_PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}

// launchFrontend 启动 Flutter 前端应用
func launchFrontend() {
	exePath, _ := os.Executable()
	dir := filepath.Dir(exePath)
	var frontendPath string
	if runtime.GOOS == "windows" {
		frontendPath = filepath.Join(dir, "app", "frontend.exe")
	} else {
		frontendPath = filepath.Join(dir, "app", "frontend")
	}
	if _, err := os.Stat(frontendPath); err == nil {
		exec.Command(frontendPath).Start()
	}
}
