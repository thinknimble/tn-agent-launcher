# locals

locals {
  # Sanitized naming for AWS resources (lowercase, no underscores, length limits)
  # Replace underscores with hyphens, convert to lowercase, and truncate if needed
  sanitized_service = lower(replace(var.service, "_", "-"))
  sanitized_environment = lower(replace(var.environment, "_", "-"))
  
  # Resource name components with length limits for different AWS services
  # ALB names: max 32 chars, alphanumeric and hyphens only
  alb_name = substr("${local.sanitized_service}-${local.sanitized_environment}", 0, 32)
  
  # Target group names: max 32 chars, alphanumeric and hyphens only  
  tg_name = substr("http-${local.sanitized_service}-${local.sanitized_environment}", 0, 32)
  
  # DB identifier: max 63 chars, lowercase alphanumeric and hyphens only
  db_identifier = substr("db-${local.sanitized_service}-${local.sanitized_environment}", 0, 63)
  
  # ElastiCache cluster: max 50 chars, lowercase alphanumeric and hyphens only
  redis_cluster_id = substr("redis-${local.sanitized_service}-${local.sanitized_environment}", 0, 50)
  
  db_endpoint     = aws_db_instance.postgres.endpoint
  db_host         = regex("^(.*):\\d+$", local.db_endpoint)[0]
  redis_host      = aws_elasticache_cluster.redis.cache_nodes[0].address
  
  # Auto-generate subdomain using base domain
  app_subdomain  = "${var.service}-${var.environment}.${var.base_domain}"
  
  # Domain logic:
  # - If use_custom_domain = true: use current_domain (user manages DNS)
  # - If use_custom_domain = false: use auto-generated subdomain (Route53 managed)
  # - Fallback to ALB DNS if nothing is set
  current_domain = var.use_custom_domain ? (
    var.current_domain != "" ? var.current_domain : aws_lb.ecs.dns_name
  ) : local.app_subdomain
  
  # Certificate logic: use custom certificate if provided, otherwise use default certificate
  certificate_arn = var.custom_certificate_arn != "" ? var.custom_certificate_arn : var.default_certificate_arn
}
