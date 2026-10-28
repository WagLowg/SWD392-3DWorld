import { useEffect, useState } from 'react'
import type { StaffRefundRequest, StaffShipment } from '../types/staff.types'

export const STAFF_DEMO_NOTICE = 'Chế độ xem trước — Dữ liệu minh họa'

export const INITIAL_STAFF_SHIPMENTS: StaffShipment[] = [
  {
    id: 101,
    trackingNumber: 'GHTK-DN26-8849102',
    carrierName: 'Giao Hàng Tiết Kiệm (GHTK)',
    carrierCode: 'GHTK',
    orderId: 301,
    orderCode: 'ORD-2026-10291',
    status: 'SHIPPED',
    shippedAt: '2026-10-27T09:30:00Z',
    deliveredAt: null,
    lastUpdatedAt: '2026-10-28T07:15:00Z',
    recipientName: 'Trần Minh Quân',
    recipientPhone: '0905123456',
    recipientAddress: '124 Bạch Đằng, Phường Hải Châu 1',
    recipientProvince: 'Đà Nẵng',
    recipientDistrict: 'Quận Hải Châu',
    recipientWard: 'Phường Hải Châu 1',
    storefrontId: 12,
    storefrontName: 'Xưởng In 3D Sáng Tạo Hà Nội',
    sellerName: 'Nguyễn Văn Hùng',
    sellerPhone: '0912345678',
    sellerAddress: 'Tổ 5, Cụm Làng Nghề Triều Khúc, Tân Triều, Thanh Trì, Hà Nội',
    totalWeightGrams: 420,
    packageDimensionsCm: { length: 22, width: 16, height: 14 },
    shippingFee: 32000,
    orderTotalAmount: 680000,
    paymentMethod: 'ZALOPAY',
    paymentStatus: 'PAID',
    codAmount: 0,
    deliveryAttempts: 1,
    notes: 'Hàng dễ vỡ — Đóng gói xốp khí 3 lớp + chống sốc góc',
    items: [
      {
        id: 1,
        productTitle: 'Mô hình Rồng Thăng Long Chân Mây 3D',
        variantName: 'Bản Resin Cao Cấp / Sơn Mạ Vàng',
        sku: 'MOD-DRG-01-GOLD',
        quantity: 1,
        unitPrice: 648000,
        weightGrams: 350,
      },
    ],
    events: [
      {
        id: 'ev-1',
        timestamp: '2026-10-27T09:30:00Z',
        status: 'PICKED_UP',
        title: 'Bàn giao GHTK thành công',
        description: 'Tài xế GHTK đã nhận kiện hàng tại bưu cục Triều Khúc (Hà Nội)',
        location: 'Kho Hà Nội Thanh Trì',
        actor: 'Shipper GHTK #4412',
      },
      {
        id: 'ev-2',
        timestamp: '2026-10-27T18:45:00Z',
        status: 'IN_TRANSIT',
        title: 'Xuất kho trung chuyển liên tỉnh',
        description: 'Kiện hàng đang trung chuyển đường bộ Hà Nội → Đà Nẵng',
        location: 'Trung tâm khai thác Bắc Ninh Hub',
        actor: 'Hệ thống GHTK',
      },
      {
        id: 'ev-3',
        timestamp: '2026-10-28T07:15:00Z',
        status: 'OUT_FOR_DELIVERY',
        title: 'Đang phát hàng',
        description: 'Tài xế đang trên đường giao kiện hàng tới địa chỉ người nhận',
        location: 'Bưu cục Hải Châu, Đà Nẵng',
        actor: 'Shipper GHTK #1089 (0934888123)',
      },
    ],
    auditHistory: [
      {
        id: 'audit-101-1',
        timestamp: '2026-10-27T09:30:00Z',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        updatedBy: 'Staff Nguyễn Văn A (PRINT_STAFF)',
        reason: 'Đã đóng gói và bàn giao cho bưu tá GHTK tại bưu cục Triều Khúc',
        source: 'STAFF_MANUAL',
      },
    ],
  },
  {
    id: 102,
    trackingNumber: 'GHTK-HN26-5510294',
    carrierName: 'Giao Hàng Tiết Kiệm (GHTK)',
    carrierCode: 'GHTK',
    orderId: 302,
    orderCode: 'ORD-2026-10284',
    status: 'DELIVERED',
    shippedAt: '2026-10-26T14:10:00Z',
    deliveredAt: '2026-10-27T16:20:00Z',
    lastUpdatedAt: '2026-10-27T16:20:00Z',
    recipientName: 'Lê Hoàng Yến',
    recipientPhone: '0988776655',
    recipientAddress: 'Số 45 Ngõ 12 Đào Tấn, Phường Cống Vị',
    recipientProvince: 'Hà Nội',
    recipientDistrict: 'Quận Ba Đình',
    recipientWard: 'Phường Cống Vị',
    storefrontId: 15,
    storefrontName: 'Studio Chế Tác 3D Sài Gòn',
    sellerName: 'Võ Thành Danh',
    sellerPhone: '0977112233',
    sellerAddress: '280 An Dương Vương, Phường 4, Quận 5, TP. Hồ Chí Minh',
    totalWeightGrams: 650,
    packageDimensionsCm: { length: 25, width: 20, height: 18 },
    shippingFee: 45000,
    orderTotalAmount: 1250000,
    paymentMethod: 'ZALOPAY',
    paymentStatus: 'PAID',
    codAmount: 0,
    deliveryAttempts: 1,
    notes: 'Giao giờ hành chính, gọi điện trước khi đến',
    items: [
      {
        id: 2,
        productTitle: 'Mô hình Sa Bàn Nhà Cổ Hà Nội Tỉ Lệ 1:50',
        variantName: 'PLA Tough / Màu Terracotta',
        sku: 'MOD-ARCH-HN-50',
        quantity: 1,
        unitPrice: 1205000,
        weightGrams: 580,
      },
    ],
    events: [
      {
        id: 'ev-11',
        timestamp: '2026-10-26T14:10:00Z',
        status: 'PICKED_UP',
        title: 'Bàn giao vận đơn',
        description: 'Bưu cục Quận 5 (TP.HCM) tiếp nhận kiện hàng',
        location: 'Bưu cục Quận 5, TP.HCM',
        actor: 'Shipper GHTK #2210',
      },
      {
        id: 'ev-12',
        timestamp: '2026-10-27T08:00:00Z',
        status: 'IN_TRANSIT',
        title: 'Đến kho phân loại Hà Nội',
        description: 'Kiện hàng nhập kho trung chuyển Cầu Giấy',
        location: 'Hub Cầu Giấy, Hà Nội',
        actor: 'Hệ thống GHTK',
      },
      {
        id: 'ev-13',
        timestamp: '2026-10-27T16:20:00Z',
        status: 'DELIVERED',
        title: 'Giao hàng thành công',
        description: 'Người nhận đã ký nhận kiện hàng nguyên vẹn',
        location: 'Đào Tấn, Ba Đình, Hà Nội',
        actor: 'Shipper GHTK #7712',
      },
    ],
    auditHistory: [
      {
        id: 'audit-102-1',
        timestamp: '2026-10-26T14:10:00Z',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        updatedBy: 'Staff Lê Thị B (PRINT_STAFF)',
        reason: 'Bàn giao thành công cho vận chuyển GHTK Ba Đình',
        source: 'STAFF_MANUAL',
      },
      {
        id: 'audit-102-2',
        timestamp: '2026-10-27T16:20:00Z',
        previousStatus: 'SHIPPED',
        newStatus: 'DELIVERED',
        updatedBy: 'Staff Lê Thị B (PRINT_STAFF)',
        reason: 'Xác nhận phát hàng thành công theo biên bản giao nhận',
        source: 'STAFF_MANUAL',
      },
    ],
  },
  {
    id: 103,
    trackingNumber: 'GHTK-SG26-9041288',
    carrierName: 'Giao Hàng Tiết Kiệm (GHTK)',
    carrierCode: 'GHTK',
    orderId: 303,
    orderCode: 'ORD-2026-10271',
    status: 'FAILED',
    shippedAt: '2026-10-25T11:00:00Z',
    deliveredAt: null,
    lastUpdatedAt: '2026-10-28T09:40:00Z',
    recipientName: 'Phạm Đức Thắng',
    recipientPhone: '0918999888',
    recipientAddress: 'Tòa nhà Landmark 81, Phường 22',
    recipientProvince: 'TP. Hồ Chí Minh',
    recipientDistrict: 'Quận Bình Thạnh',
    recipientWard: 'Phường 22',
    storefrontId: 18,
    storefrontName: 'In Nhanh 3D Cần Thơ Tech',
    sellerName: 'Nguyễn Tấn Đạt',
    sellerPhone: '0933221100',
    sellerAddress: 'Khu Công Nghệ Phần Mềm Cần Thơ, Ninh Kiều, Cần Thơ',
    totalWeightGrams: 310,
    packageDimensionsCm: { length: 18, width: 14, height: 10 },
    shippingFee: 28000,
    orderTotalAmount: 490000,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING_COLLECTION',
    codAmount: 490000,
    deliveryAttempts: 2,
    failureReason: 'Thuê bao không liên lạc được khi giao hàng (đã gọi 3 cuộc cách nhau 15 phút)',
    notes: 'Đơn COD — Cần Staff hỗ trợ liên hệ khách trước khi chuyển hoàn',
    items: [
      {
        id: 3,
        productTitle: 'Tượng Robot Mech Chiến Binh Cỡ Nhỏ',
        variantName: 'Nhựa ABS / Xám Kim Loại',
        sku: 'MOD-MECH-ABS-GREY',
        quantity: 1,
        unitPrice: 462000,
        weightGrams: 260,
      },
    ],
    events: [
      {
        id: 'ev-21',
        timestamp: '2026-10-25T11:00:00Z',
        status: 'PICKED_UP',
        title: 'Lấy hàng thành công',
        description: 'Bưu cục Ninh Kiều tiếp nhận',
        location: 'Cần Thơ Hub',
        actor: 'Shipper GHTK',
      },
      {
        id: 'ev-22',
        timestamp: '2026-10-27T10:15:00Z',
        status: 'FAILED',
        title: 'Phát không thành công lần 1',
        description: 'Không gọi được cho khách (thuê bao không nhấc máy)',
        location: 'Bình Thạnh, TP.HCM',
        actor: 'Shipper GHTK #5521',
      },
      {
        id: 'ev-23',
        timestamp: '2026-10-28T09:40:00Z',
        status: 'FAILED',
        title: 'Phát không thành công lần 2',
        description: 'Khách bận họp, hẹn lại ngày hôm sau nhưng chưa xác nhận thời gian',
        location: 'Bình Thạnh, TP.HCM',
        actor: 'Shipper GHTK #5521',
      },
    ],
    auditHistory: [
      {
        id: 'audit-103-1',
        timestamp: '2026-10-25T11:00:00Z',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        updatedBy: 'Staff Trần C (PRINT_STAFF)',
        reason: 'Bàn giao kiện hàng cho GHTK Ninh Kiều',
        source: 'STAFF_MANUAL',
      },
      {
        id: 'audit-103-2',
        timestamp: '2026-10-28T09:40:00Z',
        previousStatus: 'SHIPPED',
        newStatus: 'FAILED',
        updatedBy: 'Staff Trần C (PRINT_STAFF)',
        reason: 'Thuê bao không liên lạc được sau 2 lần phát hàng',
        source: 'STAFF_MANUAL',
      },
    ],
  },
  {
    id: 104,
    trackingNumber: 'GHTK-HUE26-7719280',
    carrierName: 'Giao Hàng Tiết Kiệm (GHTK)',
    carrierCode: 'GHTK',
    orderId: 304,
    orderCode: 'ORD-2026-10255',
    status: 'RETURNED',
    shippedAt: '2026-10-23T16:00:00Z',
    deliveredAt: null,
    lastUpdatedAt: '2026-10-27T11:30:00Z',
    recipientName: 'Đặng Quốc Huy',
    recipientPhone: '0944556677',
    recipientAddress: 'Thôn 3, Xã Phú Lộc, Huyện Phú Lộc',
    recipientProvince: 'Thừa Thiên Huế',
    recipientDistrict: 'Huyện Phú Lộc',
    recipientWard: 'Xã Phú Lộc',
    storefrontId: 12,
    storefrontName: 'Xưởng In 3D Sáng Tạo Hà Nội',
    sellerName: 'Nguyễn Văn Hùng',
    sellerPhone: '0912345678',
    sellerAddress: 'Tổ 5, Cụm Làng Nghề Triều Khúc, Tân Triều, Thanh Trì, Hà Nội',
    totalWeightGrams: 500,
    packageDimensionsCm: { length: 20, width: 20, height: 15 },
    shippingFee: 38000,
    orderTotalAmount: 850000,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING_COLLECTION',
    codAmount: 850000,
    deliveryAttempts: 3,
    failureReason: 'Người nhận từ chối nhận hàng do thay đổi kế hoạch cá nhân',
    notes: 'Đã hoàn về kho gốc của xưởng tại Hà Nội',
    items: [
      {
        id: 4,
        productTitle: 'Khung Đèn Ngủ 3D Lithophane Trăng Tròn',
        variantName: 'Bản Đầy Đủ Kèm Đế Đèn LED',
        sku: 'MOD-LITHO-MOON-01',
        quantity: 1,
        unitPrice: 812000,
        weightGrams: 420,
      },
    ],
    events: [
      {
        id: 'ev-31',
        timestamp: '2026-10-23T16:00:00Z',
        status: 'PICKED_UP',
        title: 'Bàn giao vận đơn',
        description: 'Bưu cục Hà Nội gửi hàng',
        location: 'Hà Nội',
        actor: 'Shipper GHTK',
      },
      {
        id: 'ev-32',
        timestamp: '2026-10-25T14:20:00Z',
        status: 'FAILED',
        title: 'Người nhận từ chối nhận',
        description: 'Khách hàng báo hủy đơn COD tại chỗ',
        location: 'Phú Lộc, Huế',
        actor: 'Shipper GHTK #1209',
      },
      {
        id: 'ev-33',
        timestamp: '2026-10-27T11:30:00Z',
        status: 'RETURNED',
        title: 'Hoàn hàng về xưởng thành công',
        description: 'Xưởng đã ký nhận lại gói hàng còn nguyên niêm phong',
        location: 'Kho xưởng Triều Khúc, Hà Nội',
        actor: 'Xưởng In 3D Sáng Tạo Hà Nội',
      },
    ],
    auditHistory: [
      {
        id: 'audit-104-1',
        timestamp: '2026-10-23T16:00:00Z',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        updatedBy: 'Staff Nguyễn Văn A (PRINT_STAFF)',
        reason: 'Bàn giao vận đơn cho GHTK Hà Nội',
        source: 'STAFF_MANUAL',
      },
      {
        id: 'audit-104-2',
        timestamp: '2026-10-25T14:20:00Z',
        previousStatus: 'SHIPPED',
        newStatus: 'FAILED',
        updatedBy: 'Staff Nguyễn Văn A (PRINT_STAFF)',
        reason: 'Khách hàng từ chối nhận hàng tại Phú Lộc',
        source: 'STAFF_MANUAL',
      },
      {
        id: 'audit-104-3',
        timestamp: '2026-10-27T11:30:00Z',
        previousStatus: 'FAILED',
        newStatus: 'RETURNED',
        updatedBy: 'Staff Nguyễn Văn A (PRINT_STAFF)',
        reason: 'Xưởng in đã ký nhận lại gói hàng hoàn về',
        source: 'STAFF_MANUAL',
      },
    ],
  },
  {
    id: 105,
    trackingNumber: 'GHTK-HP26-1209934',
    carrierName: 'Giao Hàng Tiết Kiệm (GHTK)',
    carrierCode: 'GHTK',
    orderId: 305,
    orderCode: 'ORD-2026-10298',
    status: 'PENDING',
    shippedAt: '2026-10-28T08:00:00Z',
    deliveredAt: null,
    lastUpdatedAt: '2026-10-28T08:00:00Z',
    recipientName: 'Vũ Thị Ngọc Ánh',
    recipientPhone: '0978665544',
    recipientAddress: '78 Lạch Tray, Phường Lạch Tray',
    recipientProvince: 'Hải Phòng',
    recipientDistrict: 'Quận Ngô Quyền',
    recipientWard: 'Phường Lạch Tray',
    storefrontId: 15,
    storefrontName: 'Studio Chế Tác 3D Sài Gòn',
    sellerName: 'Võ Thành Danh',
    sellerPhone: '0977112233',
    sellerAddress: '280 An Dương Vương, Phường 4, Quận 5, TP. Hồ Chí Minh',
    totalWeightGrams: 280,
    packageDimensionsCm: { length: 15, width: 12, height: 10 },
    shippingFee: 30000,
    orderTotalAmount: 320000,
    paymentMethod: 'ZALOPAY',
    paymentStatus: 'PAID',
    codAmount: 0,
    deliveryAttempts: 0,
    notes: 'Đơn hàng mới in xong — Chờ Staff xác nhận bàn giao cho bên vận chuyển',
    items: [
      {
        id: 5,
        productTitle: 'Móc Khóa 3D Articulated Kỳ Lân Thu Nhỏ',
        variantName: 'Silk Rainbow / Gradient Đổi Màu',
        sku: 'MOD-KEY-RAINBOW',
        quantity: 2,
        unitPrice: 145000,
        weightGrams: 100,
      },
    ],
    events: [
      {
        id: 'ev-41',
        timestamp: '2026-10-28T08:00:00Z',
        status: 'PENDING',
        title: 'Chờ bàn giao vận chuyển',
        description: 'Đã tạo vận đơn trên hệ thống, chờ bưu tá GHTK tới kho lấy hàng',
        location: 'Studio Chế Tác 3D Sài Gòn, Quận 5, TP.HCM',
        actor: 'Hệ thống 3DWorld',
      },
    ],
    auditHistory: [
      {
        id: 'audit-105-1',
        timestamp: '2026-10-28T08:00:00Z',
        previousStatus: 'PENDING',
        newStatus: 'PENDING',
        updatedBy: 'Hệ thống tự động',
        reason: 'Đơn hàng hoàn tất in ấn, sẵn sàng chờ bàn giao đơn vị vận chuyển',
        source: 'INITIAL',
      },
    ],
  },
]

export const INITIAL_STAFF_REFUNDS: StaffRefundRequest[] = [
  {
    id: 201,
    code: 'REF-2026-0012',
    orderId: 302,
    orderCode: 'ORD-2026-10284',
    customerId: 88,
    customerName: 'Lê Hoàng Yến',
    customerEmail: 'hoangyen.le@gmail.com',
    customerPhone: '0988776655',
    storefrontId: 15,
    storefrontName: 'Studio Chế Tác 3D Sài Gòn',
    sellerName: 'Võ Thành Danh',
    sellerPhone: '0977112233',
    reason: 'Sản phẩm bị nứt gãy và vỡ góc mái ngói trong quá trình vận chuyển',
    reasonCategory: 'DAMAGED_IN_TRANSIT',
    description:
      'Tôi vừa nhận hàng chiều qua lúc 16:20. Hộp ngoài có dấu hiệu móp góc nặng. Khi mở hộp thì phần mái ngói cổ của sa bàn bị nứt đôi và rụng 3 cột trụ đỡ. Tôi đã quay clip khui hộp từ lúc tem niêm phong còn nguyên.',
    requestedAmount: 1250000,
    originalOrderTotal: 1250000,
    status: 'SUBMITTED',
    adminExecutionStatus: 'NOT_REQUESTED',
    adminHandoff: null,
    submittedAt: '2026-10-27T19:40:00Z',
    receivedAt: '2026-10-27T16:20:00Z',
    refundDeadlineAt: '2026-10-30T16:20:00Z',
    reviewedAt: null,
    reviewedBy: null,
    decisionReason: null,
    shipmentSummary: {
      trackingNumber: 'GHTK-HN26-5510294',
      carrierName: 'GHTK',
      deliveredAt: '2026-10-27T16:20:00Z',
      shipmentStatus: 'DELIVERED',
    },
    items: [
      {
        id: 2001,
        orderItemId: 2,
        productTitle: 'Mô hình Sa Bàn Nhà Cổ Hà Nội Tỉ Lệ 1:50',
        variantName: 'PLA Tough / Màu Terracotta',
        sku: 'MOD-ARCH-HN-50',
        quantityPurchased: 1,
        defectiveQuantity: 1,
        unitPrice: 1205000,
        refundAmount: 1250000,
      },
    ],
    evidence: [
      {
        id: 'evd-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        caption: 'Ảnh chụp kiện hàng bị móp góc nặng khi giao tới',
        uploadedAt: '2026-10-27T19:35:00Z',
      },
      {
        id: 'evd-2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
        caption: 'Chi tiết phần mái ngói mô hình bị nứt gãy',
        uploadedAt: '2026-10-27T19:37:00Z',
      },
      {
        id: 'evd-3',
        type: 'video',
        url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        caption: 'Video quay liền mạch quá trình rạch băng dính khui kiện hàng',
        uploadedAt: '2026-10-27T19:39:00Z',
      },
    ],
    history: [
      {
        id: 'hist-1',
        timestamp: '2026-10-27T19:40:00Z',
        actor: 'Khách hàng (Lê Hoàng Yến)',
        action: 'Nộp yêu cầu hoàn tiền',
        note: 'Đính kèm 2 hình ảnh và 1 video mở hộp',
        tone: 'orange',
      },
      {
        id: 'hist-2',
        timestamp: '2026-10-27T19:40:05Z',
        actor: 'Hệ thống (3DWorld System)',
        action: 'Khóa doanh thu người bán',
        note: 'Đã tạm giữ seller_earnings = 1.144.750 VND của đơn ORD-2026-10284',
        tone: 'danger',
      },
    ],
    financialStatus: {
      sellerEarningsStatus: 'HELD',
      payoutProviderStatus: 'PENDING_STAFF_APPROVAL',
      note: 'Doanh thu xưởng đang bị đóng băng cho tới khi Staff có phán quyết cuối cùng.',
    },
  },
  {
    id: 202,
    code: 'REF-2026-0010',
    orderId: 298,
    orderCode: 'ORD-2026-10219',
    customerId: 92,
    customerName: 'Hoàng Văn Bách',
    customerEmail: 'bach.hoang@fpt.edu.vn',
    customerPhone: '0912988776',
    storefrontId: 12,
    storefrontName: 'Xưởng In 3D Sáng Tạo Hà Nội',
    sellerName: 'Nguyễn Văn Hùng',
    sellerPhone: '0912345678',
    reason: 'Lỗi in ấn nghiêm trọng: tách lớp (layer separation) và sai dung sai kích thước',
    reasonCategory: 'PRINT_DEFECT',
    description:
      'Mô hình khớp xoay không thể gắn vừa vào đế do bị cong vênh đáy khoảng 3mm. Phần cánh tay bị đứt đoạn vân in khiến khớp nối lỏng lẻo không đứng vững.',
    requestedAmount: 540000,
    originalOrderTotal: 540000,
    status: 'UNDER_REVIEW',
    adminExecutionStatus: 'NOT_REQUESTED',
    adminHandoff: null,
    submittedAt: '2026-10-26T10:15:00Z',
    receivedAt: '2026-10-25T14:00:00Z',
    refundDeadlineAt: '2026-10-28T14:00:00Z',
    reviewedAt: '2026-10-27T08:30:00Z',
    reviewedBy: 'Staff Nguyễn Cảnh An',
    decisionReason: 'Đang đối chiếu file thiết kế 3D gốc với ảnh chụp thước kẹp điện tử của khách hàng',
    shipmentSummary: {
      trackingNumber: 'GHTK-HN26-3391820',
      carrierName: 'GHTK',
      deliveredAt: '2026-10-25T14:00:00Z',
      shipmentStatus: 'DELIVERED',
    },
    items: [
      {
        id: 2002,
        orderItemId: 11,
        productTitle: 'Khớp Robot Bionic Cầm Nắm Cơ Học',
        variantName: 'PETG Carbon Fiber / Đen Mờ',
        sku: 'MOD-BIONIC-CF-BLK',
        quantityPurchased: 1,
        defectiveQuantity: 1,
        unitPrice: 510000,
        refundAmount: 540000,
      },
    ],
    evidence: [
      {
        id: 'evd-11',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=800&q=80',
        caption: 'Đo độ cong vênh đế bằng thước kẹp điện tử sai lệch 3.2mm',
        uploadedAt: '2026-10-26T10:10:00Z',
      },
    ],
    history: [
      {
        id: 'hist-11',
        timestamp: '2026-10-26T10:15:00Z',
        actor: 'Khách hàng (Hoàng Văn Bách)',
        action: 'Nộp yêu cầu khiếu nại',
        tone: 'orange',
      },
      {
        id: 'hist-12',
        timestamp: '2026-10-27T08:30:00Z',
        actor: 'Staff Nguyễn Cảnh An',
        action: 'Tiếp nhận thẩm định hồ sơ',
        note: 'Chuyển sang trạng thái Đang thẩm định',
        tone: 'violet',
      },
    ],
    financialStatus: {
      sellerEarningsStatus: 'HELD',
      payoutProviderStatus: 'PENDING_STAFF_APPROVAL',
      note: 'Doanh thu Seller đang tạm giữ.',
    },
  },
  {
    id: 203,
    code: 'REF-2026-0008',
    orderId: 295,
    orderCode: 'ORD-2026-10190',
    customerId: 74,
    customerName: 'Nguyễn Thị Mai Lan',
    customerEmail: 'mailan.nguyen@gmail.com',
    customerPhone: '0936112233',
    storefrontId: 18,
    storefrontName: 'In Nhanh 3D Cần Thơ Tech',
    sellerName: 'Nguyễn Tấn Đạt',
    sellerPhone: '0933221100',
    reason: 'Giao thiếu phụ kiện chân đế đèn LED',
    reasonCategory: 'WRONG_ITEM',
    description:
      'Gói hàng chỉ có phần quả cầu 3D, không có bộ đế đèn cảm ứng chạm như trong hợp đồng đặt hàng.',
    requestedAmount: 180000,
    originalOrderTotal: 650000,
    status: 'NEEDS_INFO',
    adminExecutionStatus: 'NOT_REQUESTED',
    adminHandoff: null,
    submittedAt: '2026-10-25T15:20:00Z',
    receivedAt: '2026-10-24T11:00:00Z',
    refundDeadlineAt: '2026-10-27T11:00:00Z',
    reviewedAt: '2026-10-26T09:10:00Z',
    reviewedBy: 'Staff Đỗ Hoàng Hồng Phúc',
    decisionReason: 'Yêu cầu khách hàng bổ sung ảnh chụp phiếu giao hàng đóng kèm trong hộp và ảnh toàn bộ linh kiện đã nhận',
    shipmentSummary: {
      trackingNumber: 'GHTK-CT26-8800192',
      carrierName: 'GHTK',
      deliveredAt: '2026-10-24T11:00:00Z',
      shipmentStatus: 'DELIVERED',
    },
    items: [
      {
        id: 2003,
        orderItemId: 18,
        productTitle: 'Đèn Ngủ Tinh Cầu Hải Vương 3D',
        variantName: 'Bộ Đế Đèn LED Cảm Ứng Riêng',
        sku: 'ACC-LED-BASE-NEPTUNE',
        quantityPurchased: 1,
        defectiveQuantity: 1,
        unitPrice: 180000,
        refundAmount: 180000,
      },
    ],
    evidence: [
      {
        id: 'evd-21',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
        caption: 'Ảnh chụp bên trong hộp chỉ có quả cầu, thiếu đế',
        uploadedAt: '2026-10-25T15:15:00Z',
      },
    ],
    history: [
      {
        id: 'hist-21',
        timestamp: '2026-10-25T15:20:00Z',
        actor: 'Khách hàng',
        action: 'Nộp yêu cầu',
        tone: 'orange',
      },
      {
        id: 'hist-22',
        timestamp: '2026-10-26T09:10:00Z',
        actor: 'Staff Đỗ Hoàng Hồng Phúc',
        action: 'Yêu cầu bổ sung chứng cứ',
        note: 'Cần bổ sung ảnh chụp phiếu xuất kho và cân nặng kiện hàng',
        tone: 'violet',
      },
    ],
    financialStatus: {
      sellerEarningsStatus: 'HELD',
      payoutProviderStatus: 'PENDING_STAFF_APPROVAL',
      note: 'Đang chờ khách phản hồi chứng cứ bổ sung.',
    },
  },
  {
    id: 204,
    code: 'REF-2026-0005',
    orderId: 289,
    orderCode: 'ORD-2026-10145',
    customerId: 61,
    customerName: 'Bùi Anh Tuấn',
    customerEmail: 'tuan.bui@outlook.com',
    customerPhone: '0903445566',
    storefrontId: 15,
    storefrontName: 'Studio Chế Tác 3D Sài Gòn',
    sellerName: 'Võ Thành Danh',
    sellerPhone: '0977112233',
    reason: 'Giao sai hoàn toàn màu sắc phiên bản đã đặt',
    reasonCategory: 'WRONG_ITEM',
    description: 'Tôi đặt bản Silk Gold đồng ánh kim nhưng nhận được bản xám xỉn nhám.',
    requestedAmount: 480000,
    originalOrderTotal: 480000,
    status: 'APPROVED',
    adminExecutionStatus: 'PENDING_ADMIN',
    adminHandoff: {
      refundRequestId: 204,
      refundCode: 'REF-2026-0005',
      sourceOrderId: 289,
      orderCode: 'ORD-2026-10145',
      staffDecision: 'APPROVED',
      staffDecisionReason: 'Xưởng in xác nhận gửi nhầm lô hàng thử nghiệm sang khách. Chấp thuận hoàn tiền 100%. Khách không cần gửi trả hàng.',
      staffReviewedAt: '2026-10-25T14:00:00Z',
      reviewedBy: 'Staff Đặng Quang Long',
      approvedRefundAmount: 480000,
      adminExecutionStatus: 'PENDING_ADMIN',
      customerName: 'Bùi Anh Tuấn',
      sellerName: 'Võ Thành Danh',
      evidenceCount: 1,
    },
    submittedAt: '2026-10-24T08:00:00Z',
    receivedAt: '2026-10-23T15:30:00Z',
    refundDeadlineAt: '2026-10-26T15:30:00Z',
    reviewedAt: '2026-10-25T14:00:00Z',
    reviewedBy: 'Staff Đặng Quang Long',
    decisionReason: 'Xưởng in xác nhận gửi nhầm lô hàng thử nghiệm sang khách. Chấp thuận hoàn tiền 100%. Khách không cần gửi trả hàng.',
    shipmentSummary: {
      trackingNumber: 'GHTK-SG26-1192837',
      carrierName: 'GHTK',
      deliveredAt: '2026-10-23T15:30:00Z',
      shipmentStatus: 'DELIVERED',
    },
    items: [
      {
        id: 2004,
        orderItemId: 25,
        productTitle: 'Tượng Kỳ Lân Phong Thủy Để Bàn',
        variantName: 'Silk Gold Kim Loại / 15cm',
        sku: 'MOD-KYLAN-SILK-GOLD',
        quantityPurchased: 1,
        defectiveQuantity: 1,
        unitPrice: 450000,
        refundAmount: 480000,
      },
    ],
    evidence: [
      {
        id: 'evd-31',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
        caption: 'Mô hình nhận được là màu xám nhám thay vì vàng bóng',
        uploadedAt: '2026-10-24T07:55:00Z',
      },
    ],
    history: [
      {
        id: 'hist-31',
        timestamp: '2026-10-24T08:00:00Z',
        actor: 'Khách hàng',
        action: 'Nộp yêu cầu',
        tone: 'orange',
      },
      {
        id: 'hist-32',
        timestamp: '2026-10-25T14:00:00Z',
        actor: 'Staff Đặng Quang Long',
        action: 'Phê duyệt hoàn tiền (APPROVED)',
        note: 'Xưởng thừa nhận gửi nhầm hàng. Miễn trả hàng.',
        tone: 'green',
      },
    ],
    financialStatus: {
      sellerEarningsStatus: 'REVERSED',
      payoutProviderStatus: 'QUEUED_FOR_GATEWAY',
      note: 'Hồ sơ đã được duyệt. Lệnh hoàn tiền đang xếp hàng xử lý cổng ZaloPay.',
    },
  },
  {
    id: 205,
    code: 'REF-2026-0003',
    orderId: 280,
    orderCode: 'ORD-2026-10080',
    customerId: 45,
    customerName: 'Phan Gia Bảo',
    customerEmail: 'baophan@gmail.com',
    customerPhone: '0919882233',
    storefrontId: 12,
    storefrontName: 'Xưởng In 3D Sáng Tạo Hà Nội',
    sellerName: 'Nguyễn Văn Hùng',
    sellerPhone: '0912345678',
    reason: 'Đổi ý không muốn mua nữa sau 5 ngày nhận hàng',
    reasonCategory: 'OTHER',
    description: 'Tôi thấy kích thước mô hình để bàn hơi to so với góc làm việc, muốn trả lại lấy tiền.',
    requestedAmount: 920000,
    originalOrderTotal: 920000,
    status: 'REJECTED',
    adminExecutionStatus: 'NOT_REQUESTED',
    adminHandoff: null,
    submittedAt: '2026-10-23T11:00:00Z',
    receivedAt: '2026-10-18T09:00:00Z',
    refundDeadlineAt: '2026-10-21T09:00:00Z',
    reviewedAt: '2026-10-23T16:00:00Z',
    reviewedBy: 'Staff Nguyễn Cảnh An',
    decisionReason: 'Yêu cầu nộp sau 5 ngày nhận hàng, vượt quá cửa sổ 72h theo điều khoản BR-026/FR-CAS-01. Sản phẩm không có lỗi sản xuất.',
    shipmentSummary: {
      trackingNumber: 'GHTK-HN26-0019283',
      carrierName: 'GHTK',
      deliveredAt: '2026-10-18T09:00:00Z',
      shipmentStatus: 'DELIVERED',
    },
    items: [
      {
        id: 2005,
        orderItemId: 33,
        productTitle: 'Mô hình Kiến Trúc Tháp Rùa Tinh Xảo',
        variantName: 'Resin Trắng Tinh / Đế Gỗ Hương',
        sku: 'MOD-THAPRUA-RESIN',
        quantityPurchased: 1,
        defectiveQuantity: 1,
        unitPrice: 880000,
        refundAmount: 920000,
      },
    ],
    evidence: [
      {
        id: 'evd-41',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
        caption: 'Mô hình nguyên vẹn không nứt vỡ',
        uploadedAt: '2026-10-23T10:55:00Z',
      },
    ],
    history: [
      {
        id: 'hist-41',
        timestamp: '2026-10-23T11:00:00Z',
        actor: 'Khách hàng',
        action: 'Nộp yêu cầu',
        tone: 'orange',
      },
      {
        id: 'hist-42',
        timestamp: '2026-10-23T16:00:00Z',
        actor: 'Staff Nguyễn Cảnh An',
        action: 'Bác bỏ khiếu nại (REJECTED)',
        note: 'Quá hạn 72h và sản phẩm không lỗi.',
        tone: 'danger',
      },
    ],
    financialStatus: {
      sellerEarningsStatus: 'RELEASED',
      payoutProviderStatus: 'CANCELLED',
      note: 'Khiếu nại bị từ chối. Tiền ký quỹ đã được giải phóng cho xưởng in.',
    },
  },
]

// Quản lý trạng thái hồ sơ hoàn tiền cục bộ (In-Memory Demo Store)
let staffRefundsStore: StaffRefundRequest[] = [...INITIAL_STAFF_REFUNDS]
const storeListeners = new Set<() => void>()

export function getStaffRefunds(): StaffRefundRequest[] {
  return staffRefundsStore
}

export function getStaffRefundById(id: number): StaffRefundRequest | undefined {
  return staffRefundsStore.find((r) => r.id === id)
}

export function updateStaffRefund(
  id: number,
  updater: (prev: StaffRefundRequest) => StaffRefundRequest,
): StaffRefundRequest | null {
  const index = staffRefundsStore.findIndex((r) => r.id === id)
  if (index === -1) return null
  const updated = updater(staffRefundsStore[index])
  staffRefundsStore = [
    ...staffRefundsStore.slice(0, index),
    updated,
    ...staffRefundsStore.slice(index + 1),
  ]
  storeListeners.forEach((fn) => {
    try {
      fn()
    } catch {}
  })
  return updated
}

export function subscribeStaffRefunds(listener: () => void): () => void {
  storeListeners.add(listener)
  return () => {
    storeListeners.delete(listener)
  }
}

/** Hook đồng bộ trạng thái danh sách hồ sơ khiếu nại giữa các màn hình Staff */
export function useStaffRefunds() {
  const [refunds, setRefunds] = useState<StaffRefundRequest[]>(() => getStaffRefunds())

  useEffect(() => {
    return subscribeStaffRefunds(() => {
      setRefunds([...getStaffRefunds()])
    })
  }, [])

  return { refunds, updateStaffRefund }
}

// Quản lý trạng thái vận đơn cục bộ (In-Memory Demo Store)
let staffShipmentsStore: StaffShipment[] = [...INITIAL_STAFF_SHIPMENTS]
const shipmentStoreListeners = new Set<() => void>()

export function getStaffShipments(): StaffShipment[] {
  return staffShipmentsStore
}

export function getStaffShipmentById(id: number): StaffShipment | undefined {
  return staffShipmentsStore.find((s) => s.id === id)
}

export function updateStaffShipment(
  id: number,
  updater: (prev: StaffShipment) => StaffShipment,
): StaffShipment | null {
  const index = staffShipmentsStore.findIndex((s) => s.id === id)
  if (index === -1) return null
  const updated = updater(staffShipmentsStore[index])
  staffShipmentsStore = [
    ...staffShipmentsStore.slice(0, index),
    updated,
    ...staffShipmentsStore.slice(index + 1),
  ]
  shipmentStoreListeners.forEach((fn) => {
    try {
      fn()
    } catch {}
  })
  return updated
}

export function subscribeStaffShipments(listener: () => void): () => void {
  shipmentStoreListeners.add(listener)
  return () => {
    shipmentStoreListeners.delete(listener)
  }
}

/** Hook đồng bộ trạng thái danh sách vận đơn giữa các màn hình Staff */
export function useStaffShipments() {
  const [shipments, setShipments] = useState<StaffShipment[]>(() => getStaffShipments())

  useEffect(() => {
    return subscribeStaffShipments(() => {
      setShipments([...getStaffShipments()])
    })
  }, [])

  return { shipments, updateStaffShipment }
}
